#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { AnchorIdl, rootNodeFromAnchorWithoutDefaultVisitor } from "@codama/nodes-from-anchor";
import { renderJavaScriptVisitor } from "@codama/renderers";
import { visit } from "@codama/visitors-core";

async function generateClients() {
    console.log('🚀 Generating Web3.js v2.0 clients from Anchor IDL...\n');

    // Check if IDL exists
    const idlPath = join(process.cwd(), 'target/idl/pod_com.json');
    if (!existsSync(idlPath)) {
        console.error('❌ IDL file not found at:', idlPath);
        console.error('Please build your Anchor program first: anchor build');
        process.exit(1);
    }

    try {
        // Load the Anchor IDL
        const idlContent = readFileSync(idlPath, 'utf8');
        const anchorIdl = JSON.parse(idlContent) as AnchorIdl;
        
        // Safely access the name property with proper type checking
        const idlName = anchorIdl.metadata && typeof anchorIdl.metadata === 'object' && 'name' in anchorIdl.metadata 
            ? (anchorIdl.metadata as { name: string }).name 
            : 'pod_com';
        console.log('✅ Loaded Anchor IDL:', idlName);

        // Create Codama tree from Anchor IDL
        const node = rootNodeFromAnchorWithoutDefaultVisitor(anchorIdl);
        console.log('✅ Created Codama tree from IDL');

        // Generate TypeScript client for Web3.js v2.0
        const outputDir = 'sdk/src/generated';
        console.log(`📁 Generating client to: ${outputDir}`);

        await visit(
            node,
            await renderJavaScriptVisitor(outputDir)
        );

        console.log('\n🎉 Successfully generated Web3.js v2.0 client!');
        console.log(`📂 Generated files in: ${outputDir}/`);
        console.log('\n📝 Next steps:');
        console.log('1. Update your SDK to use the generated client');
        console.log('2. Remove Anchor dependencies');
        console.log('3. Test with Web3.js v2.0 APIs');

    } catch (error) {
        console.error('\n❌ Error generating client:', error);
        if (error instanceof Error) {
            console.error('Error details:', error.message);
        }
        process.exit(1);
    }
}

// Run if called directly - simplified ES module check
if (process.argv[1] && process.argv[1].includes('generate-client.ts')) {
    generateClients().catch(console.error);
}

export { generateClients }; 