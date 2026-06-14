const { executeQuery } = require('../config/database');

exports.getDashboardSummary = async (req, res) => {
  console.log("\n--- [GET] COMPILING ECOSYSTEM SUMMARY TELEMETRY MAP ---");
  try {
    // 1. Compute total assets count safely
    const assetCountQuery = 'SELECT COUNT(*) as count FROM Assets';
    const assetCountRes = await executeQuery(assetCountQuery);
    const totalAssets = assetCountRes?.data?.[0]?.count || assetCountRes?.[0]?.count || 0;

    // 2. Compute global bidirectional linkages count cleanly
    const connectionCountQuery = 'SELECT COUNT(*) as count FROM AssetConnections';
    const connectionCountRes = await executeQuery(connectionCountQuery);
    const totalConnections = connectionCountRes?.data?.[0]?.count || connectionCountRes?.[0]?.count || 0;

    // 3. Compute structural taxonomy distributions breakdown matrix group loops
    const distributionQuery = 'SELECT type, COUNT(*) as count FROM Assets GROUP BY type';
    const distributionRes = await executeQuery(distributionQuery);
    const rawDistributionRows = distributionRes?.data || distributionRes || [];

    // Map distribution query outcomes cleanly onto a standardized dictionary object shell
    const taxonomyDistribution = { PROJECT: 0, VIDEO: 0, SOURCE: 0, BLOG: 0, SERVICE: 0 };
    rawDistributionRows.forEach(row => {
      if (row.type in taxonomyDistribution) {
        taxonomyDistribution[row.type] = row.count;
      }
    });

    console.log("🎉 Success: Summary parameters metrics parsed and synchronized successfully.");
    return res.json({
      success: true,
      metrics: {
        totalAssets,
        totalConnections,
        distribution: taxonomyDistribution
      }
    });
  } catch (err) {
    console.error("❌ Critical Telemetry Processing Exception:", err.message);
    return res.status(500).json({ success: false, message: "Subsystem metrics collation failure." });
  }
};