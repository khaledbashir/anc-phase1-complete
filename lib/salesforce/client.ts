/**
 * Salesforce API Client
 * 
 * Provides OAuth 2.0 authentication and REST API wrapper for Salesforce integration.
 * Currently scaffolded with mock methods until API credentials are provided.
 * 
 * Phase 2.2: Salesforce Integration (Weeks 4-6)
 */

export interface SalesforceConfig {
    clientId: string;
    clientSecret: string;
    username?: string;
    password?: string;
    securityToken?: string;
    instanceUrl?: string; // e.g., "https://yourinstance.salesforce.com"
    apiVersion?: string; // e.g., "v58.0"
}

export interface SalesforceConnectionStatus {
    success: boolean;
    message: string;
    instanceUrl?: string;
    userId?: string;
    organizationId?: string;
}

export interface SalesforceOpportunity {
    Id: string;
    Name: string;
    AccountId?: string;
    Account?: {
        Name: string;
        BillingStreet?: string;
        BillingCity?: string;
        BillingState?: string;
        BillingPostalCode?: string;
    };
    Amount?: number;
    StageName: string;
    CloseDate: string;
    Description?: string;
    CreatedDate: string;
}

/**
 * Salesforce Client Class
 * 
 * Handles authentication and API calls to Salesforce.
 * Uses jsforce library for OAuth and REST API operations.
 */
export class SalesforceClient {
    private config: SalesforceConfig | null = null;
    private accessToken: string | null = null;
    private instanceUrl: string | null = null;

    constructor(config?: SalesforceConfig) {
        if (config) {
            this.config = config;
        }
    }

    /**
     * Test connection to Salesforce
     * 
     * Currently returns mock response until credentials are provided.
     * Once credentials are available, will perform actual OAuth flow.
     */
    async testConnection(): Promise<SalesforceConnectionStatus> {
        if (!this.config || !this.config.clientId || !this.config.clientSecret) {
            return {
                success: false,
                message: "Missing Credentials - Please configure Client ID and Client Secret in Settings",
            };
        }

        // TODO: Implement actual OAuth 2.0 flow when credentials are available
        // For now, return mock response
        try {
            // Mock implementation - will be replaced with actual jsforce OAuth
            // const conn = new jsforce.Connection({
            //     oauth2: {
            //         clientId: this.config.clientId,
            //         clientSecret: this.config.clientSecret,
            //         redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/integrations/salesforce/callback`,
            //     },
            // });
            // await conn.login(this.config.username, this.config.password + this.config.securityToken);
            // this.accessToken = conn.accessToken;
            // this.instanceUrl = conn.instanceUrl;
            
            return {
                success: false,
                message: "OAuth flow not yet implemented - Waiting for API credentials",
            };
        } catch (error: any) {
            return {
                success: false,
                message: error?.message || "Connection test failed",
            };
        }
    }

    /**
     * Get OAuth authorization URL
     * 
     * Generates the URL for Salesforce OAuth authorization flow.
     */
    getAuthorizationUrl(redirectUri: string): string {
        if (!this.config?.clientId) {
            throw new Error("Client ID not configured");
        }

        const params = new URLSearchParams({
            response_type: "code",
            client_id: this.config.clientId,
            redirect_uri: redirectUri,
            scope: "api refresh_token offline_access",
        });

        const loginUrl = this.config.instanceUrl 
            ? `${this.config.instanceUrl}/services/oauth2/authorize`
            : "https://login.salesforce.com/services/oauth2/authorize";

        return `${loginUrl}?${params.toString()}`;
    }

    /**
     * Exchange authorization code for access token
     * 
     * Completes OAuth flow by exchanging code for access token.
     */
    async authorize(code: string, redirectUri: string): Promise<SalesforceConnectionStatus> {
        if (!this.config?.clientId || !this.config?.clientSecret) {
            throw new Error("Client ID and Secret must be configured");
        }

        // TODO: Implement actual token exchange
        // const response = await fetch(`${instanceUrl}/services/oauth2/token`, {
        //     method: "POST",
        //     headers: { "Content-Type": "application/x-www-form-urlencoded" },
        //     body: new URLSearchParams({
        //         grant_type: "authorization_code",
        //         client_id: this.config.clientId,
        //         client_secret: this.config.clientSecret,
        //         redirect_uri: redirectUri,
        //         code,
        //     }),
        // });

        return {
            success: false,
            message: "OAuth authorization not yet implemented - Waiting for API credentials",
        };
    }

    /**
     * Create opportunity in Salesforce
     * 
     * Creates a new opportunity from proposal data.
     */
    async createOpportunity(proposalData: any): Promise<SalesforceOpportunity | null> {
        if (!this.accessToken || !this.instanceUrl) {
            throw new Error("Not authenticated - Call testConnection() or authorize() first");
        }

        // TODO: Implement actual API call
        // const response = await fetch(`${this.instanceUrl}/services/data/v58.0/sobjects/Opportunity`, {
        //     method: "POST",
        //     headers: {
        //         "Authorization": `Bearer ${this.accessToken}`,
        //         "Content-Type": "application/json",
        //     },
        //     body: JSON.stringify({
        //         Name: proposalData.clientName || "ANC Proposal",
        //         StageName: "Prospecting",
        //         CloseDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        //         Amount: proposalData.totalValue || 0,
        //     }),
        // });

        return null;
    }

    /**
     * Update opportunity stage
     * 
     * Syncs proposal status to Salesforce opportunity stage.
     */
    async updateOpportunityStage(opportunityId: string, stage: string): Promise<boolean> {
        if (!this.accessToken || !this.instanceUrl) {
            throw new Error("Not authenticated");
        }

        // TODO: Implement actual API call
        // const response = await fetch(`${this.instanceUrl}/services/data/v58.0/sobjects/Opportunity/${opportunityId}`, {
        //     method: "PATCH",
        //     headers: {
        //         "Authorization": `Bearer ${this.accessToken}`,
        //         "Content-Type": "application/json",
        //     },
        //     body: JSON.stringify({ StageName: stage }),
        // });

        return false;
    }

    /**
     * Get opportunity by ID
     */
    async getOpportunity(opportunityId: string): Promise<SalesforceOpportunity | null> {
        if (!this.accessToken || !this.instanceUrl) {
            throw new Error("Not authenticated");
        }

        // TODO: Implement actual API call
        return null;
    }

    /**
     * Map proposal status to Salesforce stage
     */
    static mapProposalStatusToSalesforceStage(proposalStatus: string): string {
        const mapping: Record<string, string> = {
            DRAFT: "Prospecting",
            PENDING_REVIEW: "Qualification",
            APPROVED: "Needs Analysis",
            SHARED: "Proposal/Price Quote",
            SIGNED: "Closed Won",
            CLOSED: "Closed Won",
            CANCELLED: "Closed Lost",
        };

        return mapping[proposalStatus] || "Prospecting";
    }

    /**
     * Map Salesforce opportunity to proposal data
     */
    static mapOpportunityToProposal(opportunity: SalesforceOpportunity): any {
        return {
            clientName: opportunity.Account?.Name || opportunity.Name,
            clientAddress: [
                opportunity.Account?.BillingStreet,
                opportunity.Account?.BillingCity,
                opportunity.Account?.BillingState,
                opportunity.Account?.BillingPostalCode,
            ].filter(Boolean).join(", "),
            proposalName: opportunity.Name,
            totalValue: opportunity.Amount || 0,
            salesforceOpportunityId: opportunity.Id,
        };
    }
}

/**
 * Create Salesforce client instance from environment variables
 */
export function createSalesforceClient(): SalesforceClient | null {
    const clientId = process.env.SALESFORCE_CLIENT_ID;
    const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
    const instanceUrl = process.env.SALESFORCE_INSTANCE_URL;

    if (!clientId || !clientSecret) {
        return null;
    }

    return new SalesforceClient({
        clientId,
        clientSecret,
        instanceUrl,
        apiVersion: "v58.0",
    });
}
