import { getSurveys, getSurveyRequirements } from '../utils/surveyApi.js';

/**
 * GET /api/fieldops/surveys
 * List available surveys from the external Survey application.
 * Defaults to Completed (approved) surveys only.
 */
export const getAvailableSurveys = async (req, res, next) => {
  try {
    const { search, page, limit, status } = req.query;
    const params = {};
    if (search) params.search = search;
    if (page) params.page = page;
    if (limit) params.limit = limit;
    if (status) params.status = status;

    const result = await getSurveys(params);

    res.json({
      success: true,
      data: result.data?.items || result.data || [],
      pagination: {
        total: result.data?.totalCount || 0,
        page: result.data?.page || 1,
        pageSize: result.data?.pageSize || 20,
        totalPages: result.data?.totalPages || 1
      }
    });
  } catch (error) {
    console.error('Survey API proxy error:', error.message);
    res.status(502).json({
      success: false,
      message: 'Failed to fetch surveys from Survey application',
      error: error.message
    });
  }
};

/**
 * GET /api/fieldops/surveys/:surveyId/requirements
 * Get aggregated device requirements for a specific survey.
 */
export const getSurveyDeviceRequirements = async (req, res, next) => {
  try {
    const { surveyId } = req.params;
    const result = await getSurveyRequirements(surveyId);

    res.json({
      success: true,
      data: result.data || []
    });
  } catch (error) {
    console.error('Survey requirements proxy error:', error.message);
    res.status(502).json({
      success: false,
      message: 'Failed to fetch survey device requirements',
      error: error.message
    });
  }
};
