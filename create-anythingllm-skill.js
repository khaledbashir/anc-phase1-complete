#!/usr/bin/env node

/**
 * AnythingLLM Custom Agent Skill Generator
 * Generates custom skills for AnythingLLM with proper schema and structure
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

// Skill Templates
const SKILL_TEMPLATES = {
  'api-proxy': {
    name: 'API Proxy',
    description: 'Wraps an external REST API for conversational access',
    setupArgs: {
      'API_URL': {
        type: 'string',
        required: true,
        input: {
          type: 'text',
          default: 'https://api.example.com',
          placeholder: 'https://api.example.com',
          hint: 'Base URL of the API to proxy'
        },
        value: ''
      },
      'API_KEY': {
        type: 'string',
        required: false,
        input: {
          type: 'text',
          default: '',
          placeholder: 'sk-xxxxx',
          hint: 'Optional API key for authentication'
        },
        value: ''
      }
    }
  },
  'database-query': {
    name: 'Database Query',
    description: 'Queries a database and returns formatted results',
    setupArgs: {
      'DB_CONNECTION': {
        type: 'string',
        required: true,
        input: {
          type: 'text',
          default: '',
          placeholder: 'postgres://user:pass@host:5432/db',
          hint: 'Database connection string'
        },
        value: ''
      }
    }
  },
  'anc-integration': {
    name: 'ANC Integration',
    description: 'Integrates with ANC Proposal Engine',
    setupArgs: {
      'ANC_API_URL': {
        type: 'string',
        required: true,
        input: {
          type: 'text',
          default: 'https://basheer-natalia.prd42b.easypanel.host',
          placeholder: 'https://your-anc-instance.com',
          hint: 'Base URL of your ANC Proposal Engine'
        },
        value: 'https://basheer-natalia.prd42b.easypanel.host'
      },
      'AUTH_TOKEN': {
        type: 'string',
        required: false,
        input: {
          type: 'text',
          default: '',
          placeholder: 'Bearer token',
          hint: 'Optional authentication token'
        },
        value: ''
      }
    }
  },
  'custom': {
    name: 'Custom Skill',
    description: 'Build a completely custom skill',
    setupArgs: {}
  }
};

class SkillBuilder {
  constructor() {
    this.skill = {
      active: true,
      schema: 'skill-1.0.0',
      author: '@basheer',
      author_url: 'https://github.com/khaledbashir',
      license: 'MIT',
      imported: true
    };
  }

  async build() {
    console.log('\\n🤖 AnythingLLM Custom Skill Generator\\n');
    console.log('Available templates:');
    Object.entries(SKILL_TEMPLATES).forEach(([key, template], index) => {
      console.log(`  ${index + 1}. ${template.name} - ${template.description}`);
    });

    const templateChoice = await question('\\nSelect template (1-4): ');
    const templateKey = Object.keys(SKILL_TEMPLATES)[parseInt(templateChoice) - 1];
    const template = SKILL_TEMPLATES[templateKey];

    if (!template) {
      console.log('Invalid selection');
      process.exit(1);
    }

    console.log(`\\n📝 Creating ${template.name} skill...\\n`);

    // Get skill details
    this.skill.name = await question('Skill name (human readable): ');
    this.skill.hubId = (await question('Hub ID (kebab-case, folder name): ')).toLowerCase().replace(/\\s+/g, '-');
    this.skill.version = await question('Version (default: 1.0.0): ') || '1.0.0';
    this.skill.description = await question('Description (what the skill does): ');

    // Use template setup args
    this.skill.setup_args = template.setupArgs;

    // Get parameters
    console.log('\\n📊 Define skill parameters (what the LLM passes to your handler):');
    const params = {};
    let addMore = true;

    while (addMore) {
      const paramName = await question('Parameter name (or press Enter to finish): ');
      if (!paramName) {
        addMore = false;
      } else {
        const paramDesc = await question(`Description for ${paramName}: `);
        const paramType = await question(`Type (string/number/boolean, default: string): `) || 'string';
        params[paramName] = {
          description: paramDesc,
          type: paramType
        };
      }
    }

    this.skill.entrypoint = {
      file: 'handler.js',
      params
    };

    // Get examples
    console.log('\\n💡 Add example prompts (helps LLM know when to use skill):');
    this.skill.examples = [];
    let addExamples = true;

    while (addExamples) {
      const prompt = await question('Example prompt (or press Enter to finish): ');
      if (!prompt) {
        addExamples = false;
      } else {
        const callParams = {};
        for (const param of Object.keys(params)) {
          callParams[param] = await question(`  Value for ${param}: `);
        }
        this.skill.examples.push({
          prompt,
          call: JSON.stringify(callParams)
        });
      }
    }

    // Generate files
    await this.generateFiles(templateKey);

    console.log(`\\n✅ Skill "${this.skill.name}" created successfully!`);
    console.log(`\\n📁 Generated files:`);
    console.log(`  - ${this.outputDir}/plugin.json`);
    console.log(`  - ${this.outputDir}/handler.js`);
    console.log(`  - ${this.outputDir}/README.md`);
    console.log(`  - ${this.outputDir}/deploy.sh`);

    console.log(`\\n🚀 To deploy:`);
    console.log(`  1. Review the generated files`);
    console.log(`  2. Run: cd ${this.outputDir} && ./deploy.sh`);
    console.log(`  3. Reload AnythingLLM and enable the skill in Agent Settings`);

    rl.close();
  }

  async generateFiles(templateKey) {
    this.outputDir = path.join('/root/rag2/.claude/generated-skills', this.skill.hubId);

    // Create skill directory
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // Generate plugin.json
    fs.writeFileSync(
      path.join(this.outputDir, 'plugin.json'),
      JSON.stringify(this.skill, null, 2)
    );

    // Generate handler.js based on template
    const handlerContent = this.generateHandler(templateKey);
    fs.writeFileSync(path.join(this.outputDir, 'handler.js'), handlerContent);

    // Generate README.md
    const readmeContent = this.generateReadme();
    fs.writeFileSync(path.join(this.outputDir, 'README.md'), readmeContent);

    // Generate deploy.sh
    const deployScript = this.generateDeployScript();
    fs.writeFileSync(path.join(this.outputDir, 'deploy.sh'), deployScript);
    fs.chmodSync(path.join(this.outputDir, 'deploy.sh'), '755');
  }

  generateHandler(templateKey) {
    const params = Object.keys(this.skill.entrypoint.params);
    const paramString = params.length > 0 ? `{ ${params.join(', ')} }` : '{}';

    let handlerLogic = '';

    switch (templateKey) {
      case 'api-proxy':
        handlerLogic = `
      const apiUrl = this.runtimeArgs["API_URL"];
      const apiKey = this.runtimeArgs["API_KEY"];

      this.introspect(\`Calling API: \${apiUrl}...\`);

      const headers = {
        "Content-Type": "application/json"
      };

      if (apiKey) {
        headers["Authorization"] = \`Bearer \${apiKey}\`;
      }

      // Build your API request here
      const endpoint = \`\${apiUrl}/your-endpoint\`;
      const requestBody = {
        ${params.map(p => `${p}`).join(',\\n        ')}
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(\`API returned \${response.status}: \${response.statusText}\`);
      }

      const data = await response.json();
      return JSON.stringify(data, null, 2);`;
        break;

      case 'database-query':
        handlerLogic = `
      const dbConnection = this.runtimeArgs["DB_CONNECTION"];

      this.introspect("Querying database...");

      // Example using pg for PostgreSQL
      // const { Client } = require('pg');
      // const client = new Client({ connectionString: dbConnection });

      // await client.connect();
      // const result = await client.query('SELECT * FROM your_table WHERE id = $1', [id]);
      // await client.end();

      // return JSON.stringify(result.rows, null, 2);

      // Placeholder - implement your database logic here
      return JSON.stringify({
        message: "Database query placeholder",
        params: { ${params.join(', ')} }
      }, null, 2);`;
        break;

      case 'anc-integration':
        handlerLogic = `
      const ancUrl = this.runtimeArgs["ANC_API_URL"] || "https://basheer-natalia.prd42b.easypanel.host";
      const authToken = this.runtimeArgs["AUTH_TOKEN"];

      this.introspect(\`Connecting to ANC at \${ancUrl}...\`);

      const headers = {
        "Content-Type": "application/json"
      };

      if (authToken) {
        headers["Authorization"] = authToken;
      }

      // Example: Query ANC products
      const params = new URLSearchParams();
      ${params.map(p => `if (${p}) params.set("${p}", ${p});`).join('\\n      ')}

      const response = await fetch(\`\${ancUrl}/api/products?\${params.toString()}\`);

      if (!response.ok) {
        throw new Error(\`ANC API error: \${response.status}\`);
      }

      const data = await response.json();
      return JSON.stringify(data, null, 2);`;
        break;

      default:
        handlerLogic = `
      this.introspect(\`Processing with params: \${JSON.stringify({ ${params.join(', ')} })}\`);

      // Access setup args from UI configuration
      // const configValue = this.runtimeArgs["CONFIG_KEY"];

      // Access skill metadata
      // const { name, hubId, version } = this.config;

      // Implement your custom logic here
      const result = {
        success: true,
        message: "Custom skill executed",
        params: { ${params.join(', ')} },
        timestamp: new Date().toISOString()
      };

      // MUST return a string
      return JSON.stringify(result, null, 2);`;
    }

    return `// ${this.skill.name} - AnythingLLM Custom Agent Skill
// ${this.skill.description}
// Version: ${this.skill.version}

module.exports.runtime = {
  handler: async function (${paramString}) {
    try {
      // Log incoming parameters for debugging
      this.logger("${this.skill.hubId} invoked", { ${params.join(', ')} });
${handlerLogic}
    } catch (error) {
      this.introspect(\`Error: \${error.message}\`);
      this.logger("${this.skill.hubId} error", error.message);

      // MUST return a string on error
      return \`Skill failed: \${error.message}\`;
    }
  }
};
`;
  }

  generateReadme() {
    return `# ${this.skill.name}

${this.skill.description}

## Version
${this.skill.version}

## Parameters

${Object.entries(this.skill.entrypoint.params).map(([name, config]) =>
  `- **${name}** (${config.type}): ${config.description}`
).join('\\n')}

## Setup Arguments

${Object.entries(this.skill.setup_args).map(([name, config]) =>
  `- **${name}** (${config.required ? 'required' : 'optional'}): ${config.input.hint}`
).join('\\n') || 'None'}

## Examples

${this.skill.examples.map(ex =>
  `### "${ex.prompt}"
\`\`\`json
${ex.call}
\`\`\``
).join('\\n\\n')}

## Deployment

1. Deploy to AnythingLLM container:
   \`\`\`bash
   ./deploy.sh
   \`\`\`

2. Reload AnythingLLM interface

3. Enable in Agent Settings > Skills

4. Configure any setup arguments

## Author
${this.skill.author}
`;
  }

  generateDeployScript() {
    return `#!/bin/bash

# Deploy ${this.skill.name} to AnythingLLM

SKILL_ID="${this.skill.hubId}"
CONTAINER_NAME="basheer_anything-llm.1.nofw02yss38mc4kahdra7jt5b"
SKILL_PATH="/app/server/storage/plugins/agent-skills"

echo "🚀 Deploying $SKILL_ID to AnythingLLM..."

# Check if container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
  echo "❌ Container $CONTAINER_NAME not found or not running"
  echo "Finding AnythingLLM container..."
  CONTAINER_NAME=$(docker ps --format "table {{.Names}}" | grep anything-llm | head -1)
  if [ -z "$CONTAINER_NAME" ]; then
    echo "❌ No AnythingLLM container found"
    exit 1
  fi
  echo "✅ Found container: $CONTAINER_NAME"
fi

# Create skill directory in container
docker exec "$CONTAINER_NAME" mkdir -p "$SKILL_PATH/$SKILL_ID"

# Copy files
echo "📦 Copying skill files..."
docker cp plugin.json "$CONTAINER_NAME:$SKILL_PATH/$SKILL_ID/"
docker cp handler.js "$CONTAINER_NAME:$SKILL_PATH/$SKILL_ID/"
docker cp README.md "$CONTAINER_NAME:$SKILL_PATH/$SKILL_ID/" 2>/dev/null || true

# Verify deployment
if docker exec "$CONTAINER_NAME" ls "$SKILL_PATH/$SKILL_ID/plugin.json" &>/dev/null; then
  echo "✅ Skill deployed successfully!"
  echo ""
  echo "Next steps:"
  echo "1. Reload your AnythingLLM interface"
  echo "2. Go to Agent Settings > Skills"
  echo "3. Find and enable '${this.skill.name}'"
  echo "4. Configure any setup arguments"
else
  echo "❌ Deployment failed"
  exit 1
fi
`;
  }
}

// Run the builder
const builder = new SkillBuilder();
builder.build().catch(console.error);