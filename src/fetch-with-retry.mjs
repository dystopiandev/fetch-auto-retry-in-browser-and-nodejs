/***     IMPLEMENTATION    ***/
async function fetchWithRetry(
  url,
  fetchOptions,
  maxRetryCount = Infinity,
  initialBackoffMs = 1000,
  maxBackoffMs = 5000,
  beforeRetry = (attemptsLeft, backoffMs, response, error) => {
    if (response) {
      console.log(
        `Retrying ${url}: HTTP ${response.status}. ${attemptsLeft} ${
          attemptsLeft === 1 ? "attempt" : "attempts"
        } left (${backoffMs}ms backoff)`
      );
    }

    if (error) {
      console.log(
        `Retrying ${url}: ${error.message}. ${attemptsLeft} ${
          attemptsLeft === 1 ? "attempt" : "attempts"
        } left (${backoffMs}ms backoff)`
      );
    }
  },
  exemptedHttpStatusCodes = [
    400, 401, 402, 403, 405, 406, 407, 409, 410, 411, 412, 413, 414, 415, 416,
    417, 418, 421, 422, 423, 424, 426, 428, 429, 431, 451, 501, 505, 506, 507,
    508, 510, 511,
  ]
) {
  const asyncSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  let retryCount = 0;
  let finalError;
  let backoffMs = initialBackoffMs;

  while (retryCount < maxRetryCount) {
    const attemptsLeft = maxRetryCount - retryCount;

    try {
      const fetchFunc = (globalThis || window).inbuiltFetch || fetch;
      const response = await fetchFunc(url, fetchOptions);

      if (response.ok || exemptedHttpStatusCodes.includes(response.status)) {
        return response;
      }

      finalError = new Error(`HTTP ${response.status} ${response.statusText}`);
      finalError.response = response;

      beforeRetry(attemptsLeft, backoffMs, response, null);
      await asyncSleep(backoffMs);
    } catch (error) {
      finalError = error;

      beforeRetry(attemptsLeft, backoffMs, null, error);
      await asyncSleep(backoffMs);
    }

    backoffMs = Math.min(maxBackoffMs, backoffMs * 2);
    retryCount++;
  }

  throw finalError;
}

/***     MONKEY PATCHING     ***/
// Use the globalThis object if available (Node.js),
// otherwise use the window object (browser)
const context = globalThis || window;

// First, keep a copy of the original fetch function
// our fetchWithRetry function will use this when invoked
context.inbuiltFetch = (globalThis || window).fetch;

// Replace the global fetch function with the fetchWithRetry function
(globalThis || window).fetch = fetchWithRetry;

/***     USAGE     ***/
try {
  const response = await fetch(
    "https://jsonplaceholder.typicode.com/posts/1",
    { method: "GET" },
  );

  console.log("Response:", await response.json());
} catch (error) {
  console.error("Last error:", error);
}
