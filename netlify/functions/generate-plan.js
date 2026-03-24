export async function handler(event) {
    const { topics, months } = JSON.parse(event.body);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: `I have these topics to study: ${topics.join(", ")}. 
                    I have ${months} months to study them.
                    Create a simple week-wise study plan.
                    Group related topics together where possible.
                    Format it clearly, week by week.
                    Keep it simple and practical.`
                }]
            }]
        })
    });

    const data = await response.json();

    console.log("please wait...", JSON.stringify(data));

    const planText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    return {
        statusCode: 200,
        body: JSON.stringify({
            plan: planText || "Could not generate plan. Try again!"
        })
    };
}