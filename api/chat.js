
module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const gatewayUrl = process.env.OLLAMA_GATEWAY_URL;
  const token = process.env.QALVION_PROXY_TOKEN;

  if (!gatewayUrl || !token) {
    return res.status(500).json({
      error: "AI connection is not configured."
    });
  }

  try {
    const { messages } = req.body || {};

    if (!Array.isArray(messages) || !messages.length) {
      return res.status(400).json({
        error: "Please send a message."
      });
    }

    const response = await fetch(
      `${gatewayUrl.replace(/\/+$/, "")}/api/chat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          messages: messages
            .filter(m =>
              m &&
              ["user", "assistant"].includes(m.role) &&
              typeof m.content === "string"
            )
            .slice(-20)
            .map(m => ({
              role: m.role,
              content: m.content.slice(0, 5000)
            }))
        })
      }
    );

    if (!response.ok) {
      return res.status(502).json({
        error: "Local AI connection failed."
      });
    }

    const data = await response.json();

    return res.status(200).json({
      reply: data.message?.content ||
        "Sorry, Qalvion couldn't generate a reply."
    });
  } catch (error) {
    console.error("Qalvion AI error:", error.message);

    return res.status(502).json({
      error: "Could not reach the local AI."
    });
  }
};
