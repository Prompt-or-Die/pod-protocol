//! # Compression Utilities
//!
//! Compression and decompression utilities for the PoD Protocol.

use crate::error::Result;
use std::io::{Read, Write};

/// Compression algorithm enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum CompressionAlgorithm {
    /// GZIP compression
    Gzip,
    /// LZ4 compression
    Lz4,
    /// ZSTD compression
    Zstd,
}

/// Compression level enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum CompressionLevel {
    /// Fast compression
    Fast,
    /// Balanced compression
    Balanced,
    /// Best compression
    Best,
}

/// Compress message using default algorithm (GZIP with balanced level)
pub fn compress_message(content: &[u8]) -> Result<Vec<u8>> {
    compress_with_algorithm(content, CompressionAlgorithm::Gzip, CompressionLevel::Balanced)
}

/// Decompress message using auto-detection of algorithm
pub fn decompress_message(content: &[u8]) -> Result<Vec<u8>> {
    // Try to detect compression algorithm by examining magic bytes
    let algorithm = detect_compression_algorithm(content)?;
    decompress_with_algorithm(content, algorithm)
}

/// Compress data with specified algorithm and level
pub fn compress_with_algorithm(
    content: &[u8],
    algorithm: CompressionAlgorithm,
    level: CompressionLevel,
) -> Result<Vec<u8>> {
    if content.is_empty() {
        return Ok(Vec::new());
    }

    match algorithm {
        CompressionAlgorithm::Gzip => compress_gzip(content, level),
        CompressionAlgorithm::Zstd => compress_zstd(content, level),
        CompressionAlgorithm::Lz4 => {
            // For LZ4, we'll use a simple implementation since lz4 crate might not be available
            // Fall back to GZIP for now
            compress_gzip(content, level)
        }
    }
}

/// Decompress data with specified algorithm
pub fn decompress_with_algorithm(
    content: &[u8],
    algorithm: CompressionAlgorithm,
) -> Result<Vec<u8>> {
    if content.is_empty() {
        return Ok(Vec::new());
    }

    match algorithm {
        CompressionAlgorithm::Gzip => decompress_gzip(content),
        CompressionAlgorithm::Zstd => decompress_zstd(content),
        CompressionAlgorithm::Lz4 => {
            // Fall back to GZIP for LZ4
            decompress_gzip(content)
        }
    }
}

/// Compress using GZIP
fn compress_gzip(content: &[u8], level: CompressionLevel) -> Result<Vec<u8>> {
    use flate2::{write::GzEncoder, Compression};

    let compression_level = match level {
        CompressionLevel::Fast => Compression::fast(),
        CompressionLevel::Balanced => Compression::default(),
        CompressionLevel::Best => Compression::best(),
    };

    let mut encoder = GzEncoder::new(Vec::new(), compression_level);
    encoder.write_all(content)
        .map_err(|e| crate::error::PodError::CryptoError(format!("GZIP compression failed: {}", e)))?;
    
    encoder.finish()
        .map_err(|e| crate::error::PodError::CryptoError(format!("GZIP compression finalization failed: {}", e)))
}

/// Decompress GZIP
fn decompress_gzip(content: &[u8]) -> Result<Vec<u8>> {
    use flate2::read::GzDecoder;

    let mut decoder = GzDecoder::new(content);
    let mut decompressed = Vec::new();
    
    decoder.read_to_end(&mut decompressed)
        .map_err(|e| crate::error::PodError::CryptoError(format!("GZIP decompression failed: {}", e)))?;
    
    Ok(decompressed)
}

/// Compress using ZSTD
fn compress_zstd(content: &[u8], level: CompressionLevel) -> Result<Vec<u8>> {
    let compression_level = match level {
        CompressionLevel::Fast => 1,
        CompressionLevel::Balanced => 3,
        CompressionLevel::Best => 9,
    };

    zstd::encode_all(content, compression_level)
        .map_err(|e| crate::error::PodError::CryptoError(format!("ZSTD compression failed: {}", e)))
}

/// Decompress ZSTD
fn decompress_zstd(content: &[u8]) -> Result<Vec<u8>> {
    zstd::decode_all(content)
        .map_err(|e| crate::error::PodError::CryptoError(format!("ZSTD decompression failed: {}", e)))
}

/// Detect compression algorithm from magic bytes
fn detect_compression_algorithm(content: &[u8]) -> Result<CompressionAlgorithm> {
    if content.len() < 2 {
        return Err(crate::error::PodError::CryptoError("Content too short to detect compression".to_string()));
    }

    // Check for GZIP magic bytes (1f 8b)
    if content[0] == 0x1f && content[1] == 0x8b {
        return Ok(CompressionAlgorithm::Gzip);
    }

    // Check for ZSTD magic bytes (28 b5 2f fd)
    if content.len() >= 4 
        && content[0] == 0x28 
        && content[1] == 0xb5 
        && content[2] == 0x2f 
        && content[3] == 0xfd {
        return Ok(CompressionAlgorithm::Zstd);
    }

    // Default to GZIP if no magic bytes detected
    Ok(CompressionAlgorithm::Gzip)
}

/// Get compression ratio estimate for different algorithms
pub fn estimate_compression_ratio(
    content: &[u8],
    algorithm: CompressionAlgorithm,
    level: CompressionLevel,
) -> f64 {
    if content.is_empty() {
        return 1.0;
    }

    // Estimate based on algorithm and level
    let base_ratio = match algorithm {
        CompressionAlgorithm::Gzip => match level {
            CompressionLevel::Fast => 0.7,
            CompressionLevel::Balanced => 0.6,
            CompressionLevel::Best => 0.5,
        },
        CompressionAlgorithm::Zstd => match level {
            CompressionLevel::Fast => 0.65,
            CompressionLevel::Balanced => 0.55,
            CompressionLevel::Best => 0.45,
        },
        CompressionAlgorithm::Lz4 => match level {
            CompressionLevel::Fast => 0.8,
            CompressionLevel::Balanced => 0.75,
            CompressionLevel::Best => 0.7,
        },
    };

    // Adjust based on content characteristics
    let entropy_factor = calculate_entropy_factor(content);
    base_ratio * entropy_factor
}

/// Calculate entropy factor for compression estimation
fn calculate_entropy_factor(content: &[u8]) -> f64 {
    if content.is_empty() {
        return 1.0;
    }

    // Simple entropy calculation
    let mut byte_counts = [0u32; 256];
    for &byte in content {
        byte_counts[byte as usize] += 1;
    }

    let content_len = content.len() as f64;
    let mut entropy = 0.0;
    
    for &count in &byte_counts {
        if count > 0 {
            let probability = count as f64 / content_len;
            entropy -= probability * probability.log2();
        }
    }

    // Normalize entropy to [0.5, 1.5] range
    let max_entropy = 8.0; // log2(256)
    let normalized_entropy = entropy / max_entropy;
    0.5 + normalized_entropy
}

/// Compression statistics
#[derive(Debug, Clone)]
pub struct CompressionStats {
    pub original_size: usize,
    pub compressed_size: usize,
    pub compression_ratio: f64,
    pub algorithm: CompressionAlgorithm,
    pub level: CompressionLevel,
}

impl CompressionStats {
    /// Create compression stats
    pub fn new(
        original_size: usize,
        compressed_size: usize,
        algorithm: CompressionAlgorithm,
        level: CompressionLevel,
    ) -> Self {
        let compression_ratio = if original_size > 0 {
            compressed_size as f64 / original_size as f64
        } else {
            1.0
        };

        Self {
            original_size,
            compressed_size,
            compression_ratio,
            algorithm,
            level,
        }
    }

    /// Get compression percentage (higher is better)
    pub fn compression_percentage(&self) -> f64 {
        (1.0 - self.compression_ratio) * 100.0
    }

    /// Get space saved in bytes
    pub fn space_saved(&self) -> i64 {
        self.original_size as i64 - self.compressed_size as i64
    }
}

/// Compress data and return statistics
pub fn compress_with_stats(
    content: &[u8],
    algorithm: CompressionAlgorithm,
    level: CompressionLevel,
) -> Result<(Vec<u8>, CompressionStats)> {
    let original_size = content.len();
    let compressed = compress_with_algorithm(content, algorithm, level)?;
    let compressed_size = compressed.len();
    
    let stats = CompressionStats::new(original_size, compressed_size, algorithm, level);
    Ok((compressed, stats))
}

/// Find best compression algorithm for given content
pub fn find_best_compression(content: &[u8]) -> Result<(CompressionAlgorithm, CompressionLevel)> {
    if content.len() < 100 {
        // For small content, use fast compression
        return Ok((CompressionAlgorithm::Gzip, CompressionLevel::Fast));
    }

    let algorithms = [CompressionAlgorithm::Gzip, CompressionAlgorithm::Zstd];
    let levels = [CompressionLevel::Fast, CompressionLevel::Balanced, CompressionLevel::Best];
    
    let mut best_ratio = f64::INFINITY;
    let mut best_algorithm = CompressionAlgorithm::Gzip;
    let mut best_level = CompressionLevel::Balanced;

    // Test a sample of the content to find best compression
    let sample_size = content.len().min(1024);
    let sample = &content[..sample_size];

    for &algorithm in &algorithms {
        for &level in &levels {
            let estimated_ratio = estimate_compression_ratio(sample, algorithm, level);
            if estimated_ratio < best_ratio {
                best_ratio = estimated_ratio;
                best_algorithm = algorithm;
                best_level = level;
            }
        }
    }

    Ok((best_algorithm, best_level))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compression_roundtrip() {
        let original = b"Hello, World! This is a test message for compression. It should compress well because it has repetitive content. Hello, World! This is a test message for compression.";
        
        let compressed = compress_message(original).expect("Compression should succeed");
        let decompressed = decompress_message(&compressed).expect("Decompression should succeed");
        
        assert_eq!(original, decompressed.as_slice());
        assert!(compressed.len() < original.len()); // Should actually compress
    }

    #[test]
    fn test_different_algorithms() {
        let content = b"Test content for different compression algorithms. This should work with both GZIP and ZSTD.";
        
        let (gzip_compressed, gzip_stats) = compress_with_stats(
            content,
            CompressionAlgorithm::Gzip,
            CompressionLevel::Balanced,
        ).expect("GZIP compression should succeed");
        
        let (zstd_compressed, zstd_stats) = compress_with_stats(
            content,
            CompressionAlgorithm::Zstd,
            CompressionLevel::Balanced,
        ).expect("ZSTD compression should succeed");
        
        // Both should compress the content
        assert!(gzip_stats.compression_ratio < 1.0);
        assert!(zstd_stats.compression_ratio < 1.0);
        
        // Verify roundtrip for both
        let gzip_decompressed = decompress_with_algorithm(&gzip_compressed, CompressionAlgorithm::Gzip)
            .expect("GZIP decompression should succeed");
        let zstd_decompressed = decompress_with_algorithm(&zstd_compressed, CompressionAlgorithm::Zstd)
            .expect("ZSTD decompression should succeed");
        
        assert_eq!(content, gzip_decompressed.as_slice());
        assert_eq!(content, zstd_decompressed.as_slice());
    }

    #[test]
    fn test_compression_detection() {
        let content = b"Test content for compression detection.";
        
        // Compress with GZIP
        let gzip_compressed = compress_with_algorithm(
            content,
            CompressionAlgorithm::Gzip,
            CompressionLevel::Balanced,
        ).expect("GZIP compression should succeed");
        
        // Detect algorithm
        let detected_algorithm = detect_compression_algorithm(&gzip_compressed)
            .expect("Algorithm detection should succeed");
        
        assert_eq!(detected_algorithm, CompressionAlgorithm::Gzip);
    }

    #[test]
    fn test_compression_stats() {
        let content = b"This is test content for compression statistics. It has some repetitive content to ensure good compression ratios.";
        
        let (compressed, stats) = compress_with_stats(
            content,
            CompressionAlgorithm::Gzip,
            CompressionLevel::Balanced,
        ).expect("Compression with stats should succeed");
        
        assert_eq!(stats.original_size, content.len());
        assert_eq!(stats.compressed_size, compressed.len());
        assert!(stats.compression_ratio < 1.0);
        assert!(stats.compression_percentage() > 0.0);
        assert!(stats.space_saved() > 0);
    }

    #[test]
    fn test_find_best_compression() {
        let content = b"Test content to find the best compression algorithm and level for this specific data.";
        
        let (algorithm, level) = find_best_compression(content)
            .expect("Finding best compression should succeed");
        
        // Should return valid algorithm and level
        assert!(matches!(algorithm, CompressionAlgorithm::Gzip | CompressionAlgorithm::Zstd));
        assert!(matches!(level, CompressionLevel::Fast | CompressionLevel::Balanced | CompressionLevel::Best));
    }

    #[test]
    fn test_empty_content() {
        let empty_content = b"";
        
        let compressed = compress_message(empty_content).expect("Compressing empty content should succeed");
        let decompressed = decompress_message(&compressed).expect("Decompressing empty content should succeed");
        
        assert_eq!(empty_content, decompressed.as_slice());
    }

    #[test]
    fn test_entropy_calculation() {
        // High entropy content (random-like)
        let high_entropy = (0..256).map(|i| i as u8).collect::<Vec<_>>();
        let high_entropy_factor = calculate_entropy_factor(&high_entropy);
        
        // Low entropy content (repetitive)
        let low_entropy = vec![b'A'; 256];
        let low_entropy_factor = calculate_entropy_factor(&low_entropy);
        
        assert!(high_entropy_factor > low_entropy_factor);
    }
} 