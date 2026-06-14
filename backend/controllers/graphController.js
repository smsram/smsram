const { executeQuery } = require('../config/database');

// 1. Pull all connected entries regardless of matching storage slots (A or B)
exports.getConnectedGraph = async (req, res) => {
  const { assetId } = req.params;

  try {
    let query;
    let queryParams = [];

    if (assetId === 'ALL_EDGES') {
      query = `
        SELECT Link.asset_a, Link.asset_b, Link.relation_type,
               AssetA.title as asset_a_title, AssetB.title as asset_b_title
        FROM AssetConnections AS Link
        JOIN Assets AS AssetA ON Link.asset_a = AssetA.id
        JOIN Assets AS AssetB ON Link.asset_b = AssetB.id
        ORDER BY Link.created_at DESC
      `;
    } else {
      // SMART PUBLIC ROUTING FILTER GRID (Utilizing Clean, Single Words)
      query = `
        SELECT 
          LinkedAsset.id, LinkedAsset.type, LinkedAsset.title, LinkedAsset.slug, LinkedAsset.metadata, Link.relation_type
        FROM AssetConnections AS Link
        JOIN Assets AS LinkedAsset ON 
          (Link.asset_a = ? AND Link.asset_b = LinkedAsset.id AND Link.relation_type IN ('BOTH', 'BONLY')) OR
          (Link.asset_b = ? AND Link.asset_a = LinkedAsset.id AND Link.relation_type IN ('BOTH', 'AONLY'))
        WHERE LinkedAsset.id != ?
      `;
      queryParams = [assetId, assetId, assetId];
    }
    
    const response = await executeQuery(query, queryParams);
    const connectedNodes = response?.data || response?.results || (Array.isArray(response) ? response : []);

    return res.json({ success: true, data: connectedNodes });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Graph trace sweep query failure." });
  }
};

// 2. Bind two separate asset ID parameters together symmetrically
exports.connectAssets = async (req, res) => {
  console.log("\n--- [POST] ESTABLISHING NEW GRAPH EDGE LINK ---");
  const { assetA, assetB, relationType } = req.body;

  if (!assetA || !assetB || !relationType) {
    return res.status(400).json({ success: false, message: "Linking requirements missing values." });
  }

  if (assetA === assetB) {
    return res.status(400).json({ success: false, message: "Loops prevented: Cannot self-link an item." });
  }

  try {
    // Sort identifiers uniformly to easily prevent inverted tracking lines (A-B vs B-A duplicates)
    const sortedA = assetA < assetB ? assetA : assetB;
    const sortedB = assetA < assetB ? assetB : assetA;

    const query = `
      INSERT OR IGNORE INTO AssetConnections (asset_a, asset_b, relation_type) 
      VALUES (?, ?, ?)
    `;
    await executeQuery(query, [sortedA, sortedB, relationType]);

    console.log(`🎉 Success: Synced graph link: [${sortedA}] <-> [${sortedB}] As ${relationType}`);
    return res.json({ success: true, message: "Symmetrical linkage established." });
  } catch (err) {
    console.error("❌ Exception persisting graph line mapping:", err.message);
    return res.status(500).json({ success: false, message: "Failed to persist connection graph edge." });
  }
};

// 3. Drop/Invalidate an existing relationship grid line cleanly
exports.disconnectAssets = async (req, res) => {
  const { assetA, assetB, relationType } = req.params;
  console.log(`\n--- [DELETE] SEVERING SYMMETRICAL GRAPH LINK ---`);

  try {
    const sortedA = assetA < assetB ? assetA : assetB;
    const sortedB = assetA < assetB ? assetB : assetA;

    const query = `
      DELETE FROM AssetConnections 
      WHERE asset_a = ? AND asset_b = ? AND relation_type = ?
    `;
    await executeQuery(query, [sortedA, sortedB, relationType]);

    console.log(`✅ Success: Severed link between [${sortedA}] and [${sortedB}]`);
    return res.json({ success: true, message: "Linkage split cleanly." });
  } catch (err) {
    console.error("❌ Exception cutting connection graph mapping:", err.message);
    return res.status(500).json({ success: false, message: "Failed to clear relationship link." });
  }
};