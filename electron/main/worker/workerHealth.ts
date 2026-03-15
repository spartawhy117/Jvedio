export async function waitForWorkerHealth(baseUrl: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  const targetUrl = `${baseUrl}/health/ready`;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(targetUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // Retry until the timeout expires.
    }

    await delay(250);
  }

  throw new Error(`Worker health probe timed out: ${targetUrl}`);
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
