// Create ANC Proposal — AnythingLLM Custom Agent Skill
// Bridges estimator chat conversations to the ANC Proposal Engine.
// Accepts line items collected during pricing logic sessions and
// creates a real project with a shareable link.

module.exports.runtime = {
  handler: async function ({ client_name, line_items, document_type, project_name, notes }) {
    try {
      // Validate required params
      if (!client_name || !client_name.trim()) {
        return "Error: client_name is required. Please provide the client or venue name.";
      }

      if (!line_items) {
        return "Error: line_items is required. Provide a JSON array like: [{\"description\": \"LED Display\", \"price\": 84000}]";
      }

      // Parse line items
      let items;
      try {
        items = typeof line_items === "string" ? JSON.parse(line_items) : line_items;
      } catch (e) {
        return `Error: Could not parse line_items JSON. Make sure it's a valid array. Got: ${line_items}`;
      }

      if (!Array.isArray(items) || items.length === 0) {
        return "Error: line_items must be a non-empty array of {description, price} objects.";
      }

      // Get config from setup_args
      const baseUrl = (this.runtimeArgs["ANC_BASE_URL"] || "https://basheer-natalia.prd42b.easypanel.host").replace(/\/+$/, "");
      const apiKey = this.runtimeArgs["API_KEY"];

      if (!apiKey) {
        return "Error: API_KEY not configured. Go to Agent Settings > Skills > Create ANC Proposal > gear icon and set your AGENT_SKILL_API_KEY.";
      }

      // Calculate total for the progress message
      const total = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
      const formattedTotal = total.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

      this.introspect(`Creating ${(document_type || "budget").toUpperCase()} for ${client_name.trim()}...`);
      this.introspect(`${items.length} line item(s) totaling ${formattedTotal}`);

      // Call the ANC bridge endpoint
      const response = await fetch(`${baseUrl}/api/agent-skill/create-proposal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          client_name: client_name.trim(),
          project_name: project_name?.trim() || undefined,
          line_items: items,
          document_type: (document_type || "budget").toLowerCase(),
          notes: notes?.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg;
        try {
          const errorJson = JSON.parse(errorText);
          errorMsg = errorJson.error || errorText;
        } catch {
          errorMsg = errorText;
        }
        this.introspect(`API returned ${response.status}: ${errorMsg}`);
        return `Failed to create proposal: ${errorMsg} (HTTP ${response.status})`;
      }

      const result = await response.json();

      if (!result.success) {
        return `Proposal creation failed: ${result.error || "Unknown error"}`;
      }

      // Build the summary
      const itemsSummary = items.map(
        (item) => `  - ${item.description}: $${(Number(item.price) || 0).toLocaleString()}`
      ).join("\n");

      this.introspect(`Proposal created successfully! ID: ${result.project_id}`);

      return [
        `Proposal created successfully!`,
        ``,
        `Client: ${result.summary.client}`,
        `Type: ${result.summary.document_type}`,
        `Items:`,
        itemsSummary,
        `Total: ${formattedTotal}`,
        ``,
        `View and download your proposal here:`,
        result.project_url,
        ``,
        `The project is saved as a draft. Open the link to review, edit, or export the PDF.`,
      ].join("\n");

    } catch (e) {
      this.introspect(`Skill error: ${e.message}`);
      this.logger("create-anc-proposal error", e.message);
      return `Skill failed: ${e.message}`;
    }
  },
};
