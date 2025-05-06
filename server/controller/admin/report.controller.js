import ReportedContent from '../../models/report.model.js';
import Content from '../../models/content.model.js';

// Get all reported content
export const getReportedContent = async (req, res) => {
  try {
    const { status } = req.query;
    
    const reports = await ReportedContent.find(status ? { status } : {})
      .populate('userId', 'username email')
      .populate('contentId', 'title preview metadata');
    
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Resolve/reject report
export const handleReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { action } = req.body; // 'resolve' or 'reject'

    const report = await ReportedContent.findByIdAndUpdate(
      reportId,
      { status: action === 'resolve' ? 'resolved' : 'dismissed' },
      { new: true }
    );

    // If resolved, hide the content
    if (action === 'resolve') {
      await Content.findByIdAndUpdate(
        report.contentId,
        { isHidden: true }
      );
    }

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};