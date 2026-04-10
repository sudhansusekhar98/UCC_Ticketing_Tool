/**
 * Survey API Client
 * Proxies requests to the external Survey application (.NET API)
 * using X-Api-Key header authentication.
 */

const SURVEY_API_BASE_URL = process.env.SURVEY_API_BASE_URL;
const SURVEY_API_KEY = process.env.SURVEY_API_KEY;
const SURVEY_API_TIMEOUT = parseInt(process.env.SURVEY_API_TIMEOUT || '10000', 10);

/**
 * Make a request to the Survey API
 */
async function surveyApiClient(path, params = {}) {
  if (!SURVEY_API_BASE_URL || !SURVEY_API_KEY) {
    throw new Error('Survey API configuration missing. Set SURVEY_API_BASE_URL and SURVEY_API_KEY in .env');
  }

  const url = new URL(`${SURVEY_API_BASE_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.append(key, value);
    }
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SURVEY_API_TIMEOUT);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-Api-Key': SURVEY_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Survey API responded with ${response.status}: ${errorText}`);
    }

    const json = await response.json();

    if (json.success === false) {
      throw new Error(json.message || 'Survey API returned an error');
    }

    return json;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Survey API request timed out');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Get list of surveys (defaults to Completed status for approved surveys)
 */
export async function getSurveys(params = {}) {
  const queryParams = {
    page: params.page || 1,
    pageSize: params.limit || 100,
    ...params
  };
  // Default to Completed surveys (approved data)
  if (!queryParams.status) {
    queryParams.status = 'Completed';
  }
  delete queryParams.limit;
  return surveyApiClient('/surveys', queryParams);
}

/**
 * Get a single survey by ID
 */
export async function getSurveyById(surveyId) {
  return surveyApiClient(`/surveys/${surveyId}`);
}

/**
 * Get aggregated device requirements for a survey
 * Returns: [{ itemId, itemName, itemTypeId, itemTypeName, totalExisting, totalRequired }]
 */
export async function getSurveyRequirements(surveyId) {
  return surveyApiClient(`/reports/${surveyId}/requirements`);
}
