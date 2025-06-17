<?php
header('Content-Type: application/json');

try {
    $data = json_decode(file_get_contents('php://input'), true);
    $question = $data['question'] ?? '';
    $threadId = $data['threadId'] ?? null;
    $apiKey = "sk-backend-openai-eS9Xh9qLG5U3vjZ7RMFWT3BlbkFJ5c6OycweLin1roJ6f4iX";
    $assistantId = 'asst_gu3j9aT3Y2JmcsSKZHINW63J';

    // Create thread if not provided
    if (!$threadId) {
        $threadResponse = json_decode(file_get_contents(__DIR__.'/create-thread.php'));
        $threadId = $threadResponse->id;
    }

    // Create message
    $ch = curl_init("https://api.openai.com/v1/threads/$threadId/messages");
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey,
            'OpenAI-Beta: assistants=v2'
        ],
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode([
            'role' => 'user',
            'content' => $question
        ]),
        CURLOPT_RETURNTRANSFER => true,
    ]);
    $response = curl_exec($ch);
    if (curl_getinfo($ch, CURLINFO_HTTP_CODE) !== 200) {
        throw new Exception('Message creation failed: ' . $response);
    }

    // Create run
    $ch = curl_init("https://api.openai.com/v1/threads/$threadId/runs");
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey,
            'OpenAI-Beta: assistants=v2'
        ],
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode(['assistant_id' => $assistantId]),
        CURLOPT_RETURNTRANSFER => true,
    ]);
    $response = curl_exec($ch);
    $run = json_decode($response);
    if (curl_getinfo($ch, CURLINFO_HTTP_CODE) !== 200) {
        throw new Exception('Run creation failed: ' . $response);
    }

    // Check run status
    do {
        usleep(600000);
        $ch = curl_init("https://api.openai.com/v1/threads/$threadId/runs/{$run->id}");
        curl_setopt_array($ch, [
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $apiKey,
                'OpenAI-Beta: assistants=v2'
            ],
            CURLOPT_RETURNTRANSFER => true,
        ]);
        $response = curl_exec($ch);
        $runStatus = json_decode($response);
        
        if ($runStatus->status === 'failed') {
            throw new Exception('Run failed');
        }
    } while (in_array($runStatus->status, ['in_progress', 'queued']));

    // Get messages
    $ch = curl_init("https://api.openai.com/v1/threads/$threadId/messages");
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $apiKey,
            'OpenAI-Beta: assistants=v2'
        ],
        CURLOPT_RETURNTRANSFER => true,
    ]);
    $response = curl_exec($ch);
    $messages = json_decode($response)->data;

    // Format messages
    $formattedMessages = array_map(function ($message) {
        return [
            'role' => $message->role,
            'content' => array_map(function ($content) {
                return $content->text->value;
            }, $message->content)
        ];
    }, $messages);
    curl_exec($ch);

    // // Store in WordPress
    // $ch = curl_init('https://centromedicolatino.com/wp-json/custom/v1/thread/');
    // curl_setopt_array($ch, [
    //     CURLOPT_POST => true,
    //     CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    //     CURLOPT_POSTFIELDS => json_encode([
    //         'threadId' => $threadId,
    //         'message' => $question
    //     ]),
    //     CURLOPT_RETURNTRANSFER => true,
    // ]);

    echo json_encode([$formattedMessages[0]]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>