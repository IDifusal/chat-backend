interface Options {
  threadId: string;
  question: string;
}
export const storeWordpress = async (options: Options): Promise<void> => {
  const { threadId, question } = options;

  const headers = {
    'Content-Type': 'application/json',
  };

  try {
    const response = await fetch(
      'https://centromedicolatino.com/wp-json/custom/v1/thread/',
      {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          threadId: threadId,
          message: question,
        }),
      },
    );

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    // Parse the JSON response body
    const responseData = await response.json(); // Parses the data as JSON
    console.log('WORDPRESS RESPONSE DATA', responseData);
  } catch (error) {
    console.error('There was a problem with the fetch operation:', error);
  }
};
