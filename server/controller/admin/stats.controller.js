import Content from '../../models/content.model.js';
import User from '../../models/auth.model.js';
import Transaction from '../../models/transaction.model.js';

export const getPlatformStats = async (req, res) => {
  try {
    // 1. Fetch all stats in parallel
    const [
      topSavedContent,
      activeUsers,
      recentTransactions,
      contentSavesByUser
    ] = await Promise.all([
      // Top saved content with user save data
      Content.aggregate([
        {
          $match: { 'metadata.saves': { $exists: true, $gt: 0 } }
        },
        {
          $sort: { 'metadata.saves': -1 }
        },
        {
          $limit: 5
        },
        {
          $lookup: {
            from: 'users',
            localField: 'metadata.savedBy',
            foreignField: '_id',
            as: 'savedByUsers'
          }
        },
        {
          $project: {
            title: 1,
            saveCount: { $size: "$metadata.savedBy" },
            topSavers: {
              $slice: [
                {
                  $map: {
                    input: "$savedByUsers",
                    as: "user",
                    in: {
                      username: "$$user.username",
                      userId: "$$user._id",
                      credits: "$$user.creditBalance"
                    }
                  }
                },
               
              ]
            },
            createdAt: 1
          }
        }
      ]),

      // Most active users (non-admin) with transaction counts
      User.aggregate([
        {
          $match: { role: { $ne: 'admin' } }
        },
        {
          $sort: { creditBalance: -1 }
        },
        {
          $limit: 5
        },
        {
          $lookup: {
            from: 'transactions',
            localField: '_id',
            foreignField: 'userId',
            as: 'transactions'
          }
        },
        {
          $project: {
            username: 1,
            userId: '$_id',
            creditBalance: 1,
            transactionCount: { $size: "$transactions" },
            lastTransaction: { $arrayElemAt: ["$transactions", 0] }
          }
        }
      ]),

      // Recent transactions with full details
      Transaction.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('userId', 'username creditBalance')
        .lean(),

      // Content saves grouped by user
      Content.aggregate([
        { $unwind: "$metadata.savedBy" },
        {
          $group: {
            _id: "$metadata.savedBy",
            savedCount: { $sum: 1 },
            lastSaved: { $max: "$updatedAt" }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: "$user" },
        {
          $project: {
            userId: "$_id",
            username: "$user.username",
            savedCount: 1,
            lastSaved: 1,
            credits: "$user.creditBalance"
          }
        },
        { $sort: { savedCount: -1 } },
        { $limit: 5 }
      ])
    ]);

    // 2. Format response
    const stats = {
      content: {
        mostSaved: topSavedContent.map(item => ({
          title: item.title,
          totalSaves: item.saveCount,
          topSavers: item.topSavers,
          createdAt: item.createdAt
        }))
      },
      users: {
        mostActive: activeUsers.map(user => ({
          username: user.username,
          userId: user.userId,
          credits: user.creditBalance,
          transactionCount: user.transactionCount,
          lastTransaction: user.lastTransaction
        }))
      },
      transactions: {
        recent: recentTransactions.map(tx => ({
          id: tx._id,
          amount: tx.amount,
          type: tx.type,
          purpose: tx.purpose,
          user: {
            username: tx.userId?.username,
            userId: tx.userId?._id,
            credits: tx.userId?.creditBalance
          },
          date: tx.createdAt
        }))
      },
      savers: {
        topUsers: contentSavesByUser.map(user => ({
          username: user.username,
          userId: user.userId,
          totalSaved: user.savedCount,
          lastSaved: user.lastSaved,
          credits: user.credits
        }))
      },
      totals: {
        users: await User.countDocuments({ role: { $ne: 'admin' } }),
        content: await Content.countDocuments(),
        transactions: await Transaction.countDocuments()
      }
    };

    // 3. Return response
    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch platform statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};