import Transaction from '../../models/transaction.model.js';
import Content from '../../models/content.model.js';
import User from '../../models/auth.model.js';

export const getBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ balance: user.creditBalance });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
};

export const spendCredits = async (req, res) => {
  const { contentId } = req.body;
  
  if (!contentId) {
    return res.status(400).json({ error: 'Content ID is required' });
  }

  try {
    const content = await Content.findById(contentId);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    if (!content.metadata?.isPremium) {
      return res.status(400).json({ error: 'Content is not premium' });
    }

    const user = await User.findById(req.user._id);
    const unlockCost = content.metadata?.unlockCost || 10;

    if (user.creditBalance < unlockCost) {
      return res.status(400).json({ error: 'Insufficient credits' });
    }

    // 1. First update the user's balance
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { creditBalance: -unlockCost } },
      { new: true }
    );

    // 2. Then create the transaction record
    const transaction = await Transaction.create({
      userId: req.user._id,
      type: 'spend',
      amount: unlockCost,
      purpose: 'unlock_premium',
      metadata: {
        contentId: content._id,
        details: `Unlocked premium content: ${content.title}`
      }
    });

    await Content.findByIdAndUpdate(
      contentId,
      { $set: { 'metadata.isPremium': false } }
    );

    res.json({ 
      success: true,
      newBalance: updatedUser.creditBalance,
      transactionId: transaction._id,
      contentUnlocked: content.title
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Transaction failed',
      message: error.message
    });
  }
};

export const getTransactionHistory = async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .populate('metadata.contentId', 'title');

    res.json(transactions.map(tx => ({
      id: tx._id,
      type: tx.type,
      amount: tx.amount,
      purpose: tx.purpose,
      date: tx.createdAt,
      contentTitle: tx.metadata.contentId?.title,
      details: tx.metadata.details
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
};