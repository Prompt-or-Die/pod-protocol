import anchor from "@coral-xyz/anchor";
const { Program } = anchor;
/**
 * Base service class with common functionality for all services
 */
export class BaseService {
    constructor(config) {
        this.connection = config.connection;
        this.programId = config.programId;
        this.commitment = config.commitment;
        this.program = config.program;
    }
    ensureInitialized() {
        if (!this.program) {
            throw new Error("Client not initialized with wallet. Call client.initialize(wallet) first.");
        }
        return this.program;
    }
    getAccount(accountName) {
        const program = this.ensureInitialized();
        const accounts = program.account;
        if (!accounts || !accounts[accountName]) {
            throw new Error(`Account type '${accountName}' not found in program. Verify IDL is correct.`);
        }
        return accounts[accountName];
    }
    getProgramMethods() {
        const program = this.ensureInitialized();
        if (!program.methods) {
            throw new Error("Program methods not available. Verify IDL is correct and program is initialized.");
        }
        return program.methods;
    }
    setProgram(program) {
        this.program = program;
    }
    /**
     * Set the IDL for read-only operations
     */
    setIDL(idl) {
        if (!idl) {
            throw new Error("Cannot set null or undefined IDL");
        }
        this.idl = idl;
    }
    /**
     * Check if IDL is set for read-only operations
     */
    hasIDL() {
        return this.idl !== undefined;
    }
    ensureIDL() {
        if (!this.idl) {
            throw new Error("IDL not set. Call client.initialize() first or ensure IDL is properly imported.");
        }
        return this.idl;
    }
}
//# sourceMappingURL=base.js.map