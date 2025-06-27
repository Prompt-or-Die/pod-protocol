# Message Command Module

This module provides a modular, service-oriented architecture for the message command functionality in the POD-COM CLI.

## Structure

- **index.ts**: Command orchestrator that registers all message subcommands
- **handlers.ts**: Business logic for send, info, status, and list operations  
- **displayer.ts**: Output formatting and table display logic
- **validators.ts**: Input validation for addresses, content, and status values
- **types.ts**: TypeScript interfaces for options and context

## Commands

- `message send`: Send a message to another agent
- `message info <messageId>`: Display detailed message information
- `message status`: Update message status
- `message list`: List messages for an agent

## Architecture Benefits

- **Separation of Concerns**: Each file has a single responsibility
- **Type Safety**: Proper interfaces for all options and context
- **Reusability**: Modular components can be tested independently
- **Maintainability**: Clear structure for adding features or fixing bugs