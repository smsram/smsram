const { executeQuery } = require('../config/database');

function safeJsonParse(value, fallback = null) {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeAssetRow(row) {
  const tags = safeJsonParse(row.tags, []);
  const metadata = safeJsonParse(row.metadata, {});

  return {
    ...row,
    tags: Array.isArray(tags) ? tags : [],
    metadata: metadata && typeof metadata === 'object' ? metadata : {},
  };
}

// 1. Query assets with optional pagination, search, type, and stack filters
//    Important: if type is missing or "ALL", return all rows so admin assets page can filter locally.
exports.getAssets = async (req, res) => {
  try {
    const rawType = typeof req.query.type === 'string' ? req.query.type.trim() : '';
    const type = rawType ? rawType.toUpperCase() : 'ALL';

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const stack = typeof req.query.stack === 'string' ? req.query.stack.trim() : 'ALL';

    const offset = (page - 1) * limit;

    const where = [];
    const params = [];

    // Only filter by type when explicitly requested.
    if (type && type !== 'ALL') {
      where.push(`UPPER(type) = ?`);
      params.push(type);
    }

    if (search) {
      where.push(`(
        LOWER(title) LIKE ? OR
        LOWER(slug) LIKE ? OR
        LOWER(tags) LIKE ? OR
        LOWER(metadata) LIKE ?
      )`);
      const q = `%${search.toLowerCase()}%`;
      params.push(q, q, q, q);
    }

    if (stack && stack !== 'ALL') {
      where.push(`LOWER(tags) LIKE ?`);
      params.push(`%${stack.toLowerCase()}%`);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM Assets
      ${whereClause}
    `;

    const dataQuery = `
      SELECT id, slug, type, title, tags, metadata, created_at, updated_at
      FROM Assets
      ${whereClause}
      ORDER BY
        COALESCE(updated_at, created_at) DESC,
        created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countResponse = await executeQuery(countQuery, params);
    const countRows =
      countResponse?.data ||
      countResponse?.results ||
      (Array.isArray(countResponse) ? countResponse : []);
    const total = Number(countRows?.[0]?.total || 0);

    const dataResponse = await executeQuery(dataQuery, [...params, limit, offset]);
    const records =
      dataResponse?.data ||
      dataResponse?.results ||
      (Array.isArray(dataResponse) ? dataResponse : []);

    return res.json({
      success: true,
      data: records.map(normalizeAssetRow),
      pagination: {
        page,
        limit,
        total,
        hasMore: offset + records.length < total,
      },
    });
  } catch (err) {
    console.error('getAssets error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to gather database index.',
    });
  }
};

// 2. Get a single asset by slug
exports.getAssetBySlug = async (req, res) => {
  const { slug } = req.params;

  if (!slug) {
    return res.status(400).json({
      success: false,
      message: 'Slug parameter required.',
    });
  }

  try {
    const query = `
      SELECT id, slug, type, title, tags, metadata, created_at, updated_at
      FROM Assets
      WHERE slug = ?
      LIMIT 1
    `;

    const response = await executeQuery(query, [slug]);
    const records =
      response?.data ||
      response?.results ||
      (Array.isArray(response) ? response : []);

    if (!records.length) {
      return res.status(404).json({
        success: false,
        message: 'Asset node not located.',
      });
    }

    return res.json({
      success: true,
      data: normalizeAssetRow(records[0]),
    });
  } catch (err) {
    console.error('getAssetBySlug error:', err);
    return res.status(500).json({
      success: false,
      message: 'Database query exception encountered.',
    });
  }
};

// 3. Create a new asset
exports.createAsset = async (req, res) => {
  const {
    id,
    slug,
    type,
    title,
    tags = [],
    metadata = {},
  } = req.body || {};

  if (!slug || !type || !title) {
    return res.status(400).json({
      success: false,
      message: 'Incomplete configuration parameters.',
    });
  }

  try {
    const safeId = id || `asset_${Date.now()}`;
    const safeSlug = String(slug).toLowerCase().trim();
    const safeType = String(type).toUpperCase().trim();
    const safeTitle = String(title).trim();

    const tagsValue =
      typeof tags === 'string' ? tags : JSON.stringify(tags);
    const metadataValue =
      typeof metadata === 'string' ? metadata : JSON.stringify(metadata);

    const insertQuery = `
      INSERT INTO Assets
        (id, slug, type, title, tags, metadata, created_at, updated_at)
      VALUES
        (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `;

    await executeQuery(insertQuery, [
      safeId,
      safeSlug,
      safeType,
      safeTitle,
      tagsValue || '[]',
      metadataValue || '{}',
    ]);

    return res.json({
      success: true,
      message: 'Asset node registered smoothly.',
      data: {
        id: safeId,
        slug: safeSlug,
        type: safeType,
        title: safeTitle,
      },
    });
  } catch (err) {
    console.error('createAsset error:', err);
    return res.status(500).json({
      success: false,
      message: 'Asset insertion transactional conflict.',
    });
  }
};

// 4. Update an existing asset
exports.updateAsset = async (req, res) => {
  const { id } = req.params;
  const { slug, type, title, tags = [], metadata = {} } = req.body || {};

  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'Asset id parameter required.',
    });
  }

  if (!slug || !type || !title) {
    return res.status(400).json({
      success: false,
      message: 'Incomplete configuration parameters.',
    });
  }

  try {
    const safeSlug = String(slug).toLowerCase().trim();
    const safeType = String(type).toUpperCase().trim();
    const safeTitle = String(title).trim();

    const tagsValue =
      typeof tags === 'string' ? tags : JSON.stringify(tags);
    const metadataValue =
      typeof metadata === 'string' ? metadata : JSON.stringify(metadata);

    const updateQuery = `
      UPDATE Assets
      SET slug = ?,
          type = ?,
          title = ?,
          tags = ?,
          metadata = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `;

    await executeQuery(updateQuery, [
      safeSlug,
      safeType,
      safeTitle,
      tagsValue || '[]',
      metadataValue || '{}',
      id,
    ]);

    return res.json({
      success: true,
      message: 'Asset node updated smoothly.',
    });
  } catch (err) {
    console.error('updateAsset error:', err);
    return res.status(500).json({
      success: false,
      message: 'Asset mutation transactional conflict.',
    });
  }
};

// 5. Delete an asset
exports.deleteAsset = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'Asset id parameter required.',
    });
  }

  try {
    const deleteQuery = `DELETE FROM Assets WHERE id = ?`;
    await executeQuery(deleteQuery, [id]);

    return res.json({
      success: true,
      message: 'Asset node dropped cleanly.',
    });
  } catch (err) {
    console.error('deleteAsset error:', err);
    return res.status(500).json({
      success: false,
      message: 'Asset removal transactional conflict.',
    });
  }
};