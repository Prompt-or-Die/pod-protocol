//! # PoD Protocol Procedural Macros
//!
//! This crate provides procedural macros to simplify common patterns
//! in the PoD Protocol Rust SDK.

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, DeriveInput, Data, Fields};

/// Derive macro for implementing common service traits
#[proc_macro_derive(PodService)]
pub fn derive_pod_service(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as DeriveInput);
    let name = &input.ident;
    
    let expanded = quote! {
        impl #name {
            /// Get service name for logging and metrics
            pub fn service_name() -> &'static str {
                stringify!(#name)
            }
        }
    };
    
    TokenStream::from(expanded)
}

/// Derive macro for implementing validation traits
#[proc_macro_derive(ValidatedRequest)]
pub fn derive_validated_request(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as DeriveInput);
    let name = &input.ident;
    
    let validation_calls = match &input.data {
        Data::Struct(data) => {
            match &data.fields {
                Fields::Named(fields) => {
                    let validations = fields.named.iter().map(|field| {
                        let field_name = &field.ident;
                        let field_type = &field.ty;
                        
                        // Generate appropriate validation based on field type
                        if let syn::Type::Path(type_path) = field_type {
                            if let Some(segment) = type_path.path.segments.last() {
                                match segment.ident.to_string().as_str() {
                                    "String" => quote! {
                                        if self.#field_name.is_empty() {
                                            return Err(ValidationError::EmptyField(stringify!(#field_name)));
                                        }
                                    },
                                    "u64" | "u32" | "u16" | "u8" => quote! {
                                        // Numeric validation can be added here if needed
                                    },
                                    _ => quote! {}
                                }
                            } else {
                                quote! {}
                            }
                        } else {
                            quote! {}
                        }
                    });
                    
                    quote! {
                        #(#validations)*
                    }
                }
                _ => quote! {}
            }
        }
        _ => quote! {}
    };
    
    let expanded = quote! {
        impl #name {
            /// Validate this request
            pub fn validate(&self) -> Result<(), ValidationError> {
                #validation_calls
                Ok(())
            }
        }
    };
    
    TokenStream::from(expanded)
}

/// Macro to generate PDA finding functions
#[proc_macro]
pub fn generate_pda_finder(input: TokenStream) -> TokenStream {
    let input_str = input.to_string();
    let parts: Vec<&str> = input_str.split(',').map(|s| s.trim()).collect();
    
    if parts.len() != 2 {
        panic!("generate_pda_finder expects exactly 2 arguments: account_type, seed_prefix");
    }
    
    let account_type = parts[0].trim_matches('"');
    let seed_prefix = parts[1].trim_matches('"');
    
    let function_name = syn::Ident::new(
        &format!("find_{}_pda", account_type.to_lowercase()),
        proc_macro2::Span::call_site()
    );
    
    let expanded = quote! {
        /// Find PDA for the account
        pub fn #function_name(
            wallet: &solana_sdk::pubkey::Pubkey,
            program_id: &solana_sdk::pubkey::Pubkey,
        ) -> (solana_sdk::pubkey::Pubkey, u8) {
            solana_sdk::pubkey::Pubkey::find_program_address(
                &[#seed_prefix.as_bytes(), wallet.as_ref()],
                program_id,
            )
        }
    };
    
    TokenStream::from(expanded)
}

/// Attribute macro for service methods that require authentication
#[proc_macro_attribute]
pub fn requires_auth(_args: TokenStream, input: TokenStream) -> TokenStream {
    let mut function = parse_macro_input!(input as syn::ItemFn);
    
    // Insert authentication check at the beginning of the function
    let auth_check = quote! {
        if self.program.is_none() {
            return Err(ServiceError::NotInitialized);
        }
    };
    
    // Prepend the auth check to the function body
    let original_block = &function.block;
    function.block = Box::new(syn::parse2(quote! {
        {
            #auth_check
            #original_block
        }
    }).unwrap());
    
    TokenStream::from(quote! { #function })
}

/// Attribute macro for adding retry logic to service methods
#[proc_macro_attribute]
pub fn with_retry(_args: TokenStream, input: TokenStream) -> TokenStream {
    let function = parse_macro_input!(input as syn::ItemFn);
    let _function_name = &function.sig.ident;
    let _inputs = &function.sig.inputs;
    let _output = &function.sig.output;
    let original_block = &function.block;
    
    let expanded = quote! {
        #function.sig {
            use crate::utils::retry::retry_with_backoff;
            
            retry_with_backoff(
                || async move #original_block,
                &self.config.retry_config
            ).await
        }
    };
    
    TokenStream::from(expanded)
}

/// Macro to generate builder pattern implementations
#[proc_macro_derive(Builder)]
pub fn derive_builder(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as DeriveInput);
    let name = &input.ident;
    let builder_name = syn::Ident::new(&format!("{}Builder", name), name.span());
    
    let fields = match &input.data {
        Data::Struct(data) => {
            match &data.fields {
                Fields::Named(fields) => &fields.named,
                _ => panic!("Builder can only be derived for structs with named fields"),
            }
        }
        _ => panic!("Builder can only be derived for structs"),
    };
    
    let builder_fields = fields.iter().map(|field| {
        let field_name = &field.ident;
        let field_type = &field.ty;
        quote! {
            #field_name: Option<#field_type>
        }
    });
    
    let builder_methods = fields.iter().map(|field| {
        let field_name = &field.ident;
        let field_type = &field.ty;
        quote! {
            pub fn #field_name(mut self, #field_name: #field_type) -> Self {
                self.#field_name = Some(#field_name);
                self
            }
        }
    });
    
    let build_assignments = fields.iter().map(|field| {
        let field_name = &field.ident;
        quote! {
            #field_name: self.#field_name.ok_or(concat!("Field '", stringify!(#field_name), "' is required"))?
        }
    });
    
    let expanded = quote! {
        #[derive(Debug, Default)]
        pub struct #builder_name {
            #(#builder_fields,)*
        }
        
        impl #builder_name {
            pub fn new() -> Self {
                Self::default()
            }
            
            #(#builder_methods)*
            
            pub fn build(self) -> Result<#name, &'static str> {
                Ok(#name {
                    #(#build_assignments,)*
                })
            }
        }
        
        impl #name {
            pub fn builder() -> #builder_name {
                #builder_name::new()
            }
        }
    };
    
    TokenStream::from(expanded)
}

// Define ValidationError for the derive macros
#[proc_macro]
pub fn define_validation_error(_input: TokenStream) -> TokenStream {
    let expanded = quote! {
        #[derive(Debug)]
        pub enum ValidationError {
            EmptyField(&'static str),
            InvalidLength { field: &'static str, max: usize, actual: usize },
            InvalidFormat(&'static str),
        }
        
        impl std::fmt::Display for ValidationError {
            fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                match self {
                    ValidationError::EmptyField(field) => write!(f, "Field '{}' cannot be empty", field),
                    ValidationError::InvalidLength { field, max, actual } => {
                        write!(f, "Field '{}' length {} exceeds maximum {}", field, actual, max)
                    }
                    ValidationError::InvalidFormat(field) => write!(f, "Field '{}' has invalid format", field),
                }
            }
        }
        
        impl std::error::Error for ValidationError {}
    };
    
    TokenStream::from(expanded)
} 