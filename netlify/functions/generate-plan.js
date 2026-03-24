export async function handler(event) {
    try {
        const { topics, months } = JSON.parse(event.body);

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Create a simple week by week study plan for these topics: ${topics.join(", ")}. I have ${months} months. Group related topics together. Keep it simple.`
                    }]
                }]
            })
        });

        const data = await response.json();

        if (data.error) {
            return {
                statusCode: 200,
                body: JSON.stringify({ plan: "Gemini Error: " + data.error.message })
            };
        }

        const planText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        return {
            statusCode: 200,
            body: JSON.stringify({ plan: planText || "No plan generated!" })
        };

    } catch (err) {
        return {
            statusCode: 200,
            body: JSON.stringify({ plan: "Error: " + err.message })
        };
    }
}