//! # Network Utilities
//!
//! Network topology and connectivity utilities for the PoD Protocol.

use std::collections::{HashMap, HashSet, VecDeque, BinaryHeap};
use std::cmp::Reverse;
use solana_sdk::pubkey::Pubkey;
use crate::error::Result;
use pod_sdk_crypto::Hash;

/// Calculate distance between two agents using their public key similarity
pub fn calculate_distance(agent1: &Pubkey, agent2: &Pubkey) -> u32 {
    // Use Hamming distance between public key bytes as a network distance metric
    let bytes1 = agent1.as_ref();
    let bytes2 = agent2.as_ref();
    
    let hamming_distance: u32 = bytes1
        .iter()
        .zip(bytes2.iter())
        .map(|(a, b)| (a ^ b).count_ones())
        .sum();
    
    // Normalize to a reasonable range (1-10)
    let normalized_distance = ((hamming_distance as f64 / 256.0) * 9.0 + 1.0) as u32;
    normalized_distance.min(10).max(1)
}

/// Network topology structure
#[derive(Debug, Clone)]
pub struct NetworkTopology {
    nodes: Vec<Pubkey>,
    connections: HashMap<Pubkey, HashSet<Pubkey>>,
    node_weights: HashMap<Pubkey, f64>, // Weight/importance of each node
}

impl NetworkTopology {
    /// Create new network topology
    pub fn new(nodes: Vec<Pubkey>, connections: HashMap<Pubkey, HashSet<Pubkey>>) -> Self {
        // Initialize node weights based on connection count
        let mut node_weights = HashMap::new();
        for node in &nodes {
            let weight = connections.get(node).map(|c| c.len() as f64).unwrap_or(0.0);
            node_weights.insert(*node, weight);
        }
        
        Self { nodes, connections, node_weights }
    }

    /// Create new network topology with weights
    pub fn with_weights(
        nodes: Vec<Pubkey>, 
        connections: HashMap<Pubkey, HashSet<Pubkey>>,
        weights: HashMap<Pubkey, f64>
    ) -> Self {
        Self { nodes, connections, node_weights: weights }
    }

    /// Find nearby agents using graph traversal and distance calculation
    pub fn find_nearby_agents(&self, reference: &Pubkey, max_distance: u32, limit: Option<u32>) -> Vec<(Pubkey, u32)> {
        let mut visited = HashSet::new();
        let mut queue = VecDeque::new();
        let mut nearby_agents = Vec::new();
        
        // Start BFS from reference node
        queue.push_back(*reference);
        visited.insert(*reference);
        
        // BFS to find agents within max_distance
        while let Some(current) = queue.pop_front() {
            if let Some(neighbors) = self.connections.get(&current) {
                for &neighbor in neighbors {
                    if !visited.contains(&neighbor) {
                        visited.insert(neighbor);
                        
                        let distance = calculate_distance(reference, &neighbor);
                        if distance <= max_distance {
                            nearby_agents.push((neighbor, distance));
                            queue.push_back(neighbor);
                        }
                    }
                }
            }
        }
        
        // Sort by distance and apply limit
        nearby_agents.sort_by_key(|(_, distance)| *distance);
        if let Some(limit) = limit {
            nearby_agents.truncate(limit as usize);
        }
        
        nearby_agents
    }

    /// Get total connections
    pub fn get_total_connections(&self) -> u64 {
        self.connections.values().map(|s| s.len() as u64).sum()
    }

    /// Calculate network density (ratio of actual edges to possible edges)
    pub fn calculate_density(&self) -> f64 {
        let node_count = self.nodes.len() as f64;
        if node_count <= 1.0 {
            return 0.0;
        }
        
        let total_connections = self.get_total_connections() as f64;
        let max_possible_connections = node_count * (node_count - 1.0) / 2.0;
        
        // Since connections are bidirectional, divide by 2
        (total_connections / 2.0) / max_possible_connections
    }

    /// Calculate clustering coefficient (average of local clustering coefficients)
    pub fn calculate_clustering_coefficient(&self) -> f64 {
        if self.nodes.is_empty() {
            return 0.0;
        }
        
        let mut total_coefficient = 0.0;
        let mut valid_nodes = 0;
        
        for node in &self.nodes {
            if let Some(neighbors) = self.connections.get(node) {
                if neighbors.len() < 2 {
                    continue; // Can't calculate clustering for nodes with < 2 neighbors
                }
                
                // Count triangles formed with this node
                let mut triangles = 0;
                let neighbors_vec: Vec<_> = neighbors.iter().collect();
                
                for i in 0..neighbors_vec.len() {
                    for j in i + 1..neighbors_vec.len() {
                        let neighbor1 = neighbors_vec[i];
                        let neighbor2 = neighbors_vec[j];
                        
                        // Check if neighbor1 and neighbor2 are connected
                        if let Some(neighbor1_connections) = self.connections.get(neighbor1) {
                            if neighbor1_connections.contains(neighbor2) {
                                triangles += 1;
                            }
                        }
                    }
                }
                
                let possible_triangles = neighbors.len() * (neighbors.len() - 1) / 2;
                let local_coefficient = triangles as f64 / possible_triangles as f64;
                total_coefficient += local_coefficient;
                valid_nodes += 1;
            }
        }
        
        if valid_nodes == 0 {
            0.0
        } else {
            total_coefficient / valid_nodes as f64
        }
    }

    /// Calculate average path length using Dijkstra's algorithm
    pub fn calculate_average_path_length(&self) -> f64 {
        if self.nodes.len() <= 1 {
            return 0.0;
        }
        
        let mut total_path_length = 0.0;
        let mut path_count = 0;
        
        // Calculate shortest paths between all pairs of nodes
        for source in &self.nodes {
            let distances = self.dijkstra_shortest_paths(source);
            
            for (target, distance) in distances {
                if target != *source && distance < f64::INFINITY {
                    total_path_length += distance;
                    path_count += 1;
                }
            }
        }
        
        if path_count == 0 {
            f64::INFINITY
        } else {
            total_path_length / path_count as f64
        }
    }

    /// Get largest component size using Union-Find algorithm
    pub fn get_largest_component_size(&self) -> u64 {
        let mut parent: HashMap<Pubkey, Pubkey> = HashMap::new();
        let mut size: HashMap<Pubkey, u64> = HashMap::new();
        
        // Initialize Union-Find structure
        for &node in &self.nodes {
            parent.insert(node, node);
            size.insert(node, 1);
        }
        
        // Find operation with path compression
        fn find(node: &Pubkey, parent: &mut HashMap<Pubkey, Pubkey>) -> Pubkey {
            if parent[node] != *node {
                parent.insert(*node, find(&parent[node], parent));
            }
            parent[node]
        }
        
        // Union operation
        for (node, neighbors) in &self.connections {
            for &neighbor in neighbors {
                let root1 = find(node, &mut parent);
                let root2 = find(&neighbor, &mut parent);
                
                if root1 != root2 {
                    // Union by size
                    if size[&root1] < size[&root2] {
                        parent.insert(root1, root2);
                        size.insert(root2, size[&root1] + size[&root2]);
                    } else {
                        parent.insert(root2, root1);
                        size.insert(root1, size[&root1] + size[&root2]);
                    }
                }
            }
        }
        
        // Find the largest component
        let mut component_sizes: HashMap<Pubkey, u64> = HashMap::new();
        for &node in &self.nodes {
            let root = find(&node, &mut parent);
            *component_sizes.entry(root).or_insert(0) += 1;
        }
        
        component_sizes.values().max().copied().unwrap_or(0)
    }

    /// Get isolated agents (nodes with no connections)
    pub fn get_isolated_agents(&self) -> Vec<Pubkey> {
        self.nodes
            .iter()
            .filter(|node| {
                self.connections
                    .get(node)
                    .map_or(true, |connections| connections.is_empty())
            })
            .copied()
            .collect()
    }

    /// Find bridge agents (articulation points in the graph)
    pub fn find_bridge_agents(&self) -> Vec<Pubkey> {
        let mut visited = HashSet::new();
        let mut disc = HashMap::new();
        let mut low = HashMap::new();
        let mut parent = HashMap::new();
        let mut articulation_points = HashSet::new();
        let mut time = 0;
        
        for &node in &self.nodes {
            if !visited.contains(&node) {
                self.find_articulation_points_util(
                    node,
                    &mut visited,
                    &mut disc,
                    &mut low,
                    &mut parent,
                    &mut articulation_points,
                    &mut time,
                );
            }
        }
        
        articulation_points.into_iter().collect()
    }

    /// Find distant connections within a distance range
    pub fn find_distant_connections(&self, agent: &Pubkey, min_distance: u32, max_distance: u32) -> Vec<(Pubkey, u32)> {
        let mut distant_connections = Vec::new();
        
        // Use BFS to find all reachable nodes with their distances
        let mut visited = HashSet::new();
        let mut queue = VecDeque::new();
        let mut distances = HashMap::new();
        
        queue.push_back((*agent, 0));
        visited.insert(*agent);
        distances.insert(*agent, 0);
        
        while let Some((current, current_dist)) = queue.pop_front() {
            if let Some(neighbors) = self.connections.get(&current) {
                for &neighbor in neighbors {
                    if !visited.contains(&neighbor) {
                        visited.insert(neighbor);
                        
                        let neighbor_dist = current_dist + 1;
                        distances.insert(neighbor, neighbor_dist);
                        
                        if neighbor_dist <= max_distance {
                            queue.push_back((neighbor, neighbor_dist));
                        }
                        
                        if neighbor_dist >= min_distance && neighbor_dist <= max_distance {
                            distant_connections.push((neighbor, neighbor_dist));
                        }
                    }
                }
            }
        }
        
        // Sort by distance
        distant_connections.sort_by_key(|(_, distance)| *distance);
        distant_connections
    }

    /// Get network statistics
    pub fn get_network_stats(&self) -> NetworkStats {
        NetworkStats {
            total_nodes: self.nodes.len() as u64,
            total_connections: self.get_total_connections(),
            density: self.calculate_density(),
            clustering_coefficient: self.calculate_clustering_coefficient(),
            average_path_length: self.calculate_average_path_length(),
            largest_component_size: self.get_largest_component_size(),
            isolated_agents_count: self.get_isolated_agents().len() as u64,
            bridge_agents_count: self.find_bridge_agents().len() as u64,
        }
    }

    /// Dijkstra's shortest path algorithm
    fn dijkstra_shortest_paths(&self, source: &Pubkey) -> HashMap<Pubkey, f64> {
        let mut distances = HashMap::new();
        let mut heap = BinaryHeap::new();
        
        // Initialize distances
        for &node in &self.nodes {
            distances.insert(node, f64::INFINITY);
        }
        distances.insert(*source, 0.0);
        heap.push(Reverse((0.0, *source)));
        
        while let Some(Reverse((current_dist, current_node))) = heap.pop() {
            if current_dist > distances[&current_node] {
                continue;
            }
            
            if let Some(neighbors) = self.connections.get(&current_node) {
                for &neighbor in neighbors {
                    let edge_weight = calculate_distance(&current_node, &neighbor) as f64;
                    let new_dist = current_dist + edge_weight;
                    
                    if new_dist < distances[&neighbor] {
                        distances.insert(neighbor, new_dist);
                        heap.push(Reverse((new_dist, neighbor)));
                    }
                }
            }
        }
        
        distances
    }

    /// Utility function for finding articulation points
    fn find_articulation_points_util(
        &self,
        u: Pubkey,
        visited: &mut HashSet<Pubkey>,
        disc: &mut HashMap<Pubkey, usize>,
        low: &mut HashMap<Pubkey, usize>,
        parent: &mut HashMap<Pubkey, Option<Pubkey>>,
        articulation_points: &mut HashSet<Pubkey>,
        time: &mut usize,
    ) {
        let mut children = 0;
        visited.insert(u);
        disc.insert(u, *time);
        low.insert(u, *time);
        *time += 1;
        
        if let Some(neighbors) = self.connections.get(&u) {
            for &v in neighbors {
                if !visited.contains(&v) {
                    children += 1;
                    parent.insert(v, Some(u));
                    
                    self.find_articulation_points_util(
                        v, visited, disc, low, parent, articulation_points, time,
                    );
                    
                    low.insert(u, low[&u].min(low[&v]));
                    
                    // Check if u is an articulation point
                    if parent.get(&u).unwrap_or(&None).is_none() && children > 1 {
                        articulation_points.insert(u);
                    }
                    
                    if parent.get(&u).unwrap_or(&None).is_some() && low[&v] >= disc[&u] {
                        articulation_points.insert(u);
                    }
                } else if Some(v) != *parent.get(&u).unwrap_or(&None) {
                    low.insert(u, low[&u].min(disc[&v]));
                }
            }
        }
    }

    /// Add a node to the network
    pub fn add_node(&mut self, node: Pubkey, weight: Option<f64>) {
        if !self.nodes.contains(&node) {
            self.nodes.push(node);
            self.connections.insert(node, HashSet::new());
            self.node_weights.insert(node, weight.unwrap_or(0.0));
        }
    }

    /// Add a connection between two nodes
    pub fn add_connection(&mut self, node1: Pubkey, node2: Pubkey) -> Result<()> {
        if !self.nodes.contains(&node1) || !self.nodes.contains(&node2) {
            return Err(crate::error::PodError::InvalidInput("One or both nodes not found in network".to_string()));
        }
        
        self.connections.entry(node1).or_insert_with(HashSet::new).insert(node2);
        self.connections.entry(node2).or_insert_with(HashSet::new).insert(node1);
        
        Ok(())
    }

    /// Remove a node from the network
    pub fn remove_node(&mut self, node: &Pubkey) {
        if let Some(position) = self.nodes.iter().position(|&n| n == *node) {
            self.nodes.remove(position);
        }
        
        // Remove all connections to this node
        if let Some(connections) = self.connections.remove(node) {
            for connected_node in connections {
                if let Some(connected_node_connections) = self.connections.get_mut(&connected_node) {
                    connected_node_connections.remove(node);
                }
            }
        }
        
        self.node_weights.remove(node);
    }

    /// Get node degree (number of connections)
    pub fn get_node_degree(&self, node: &Pubkey) -> usize {
        self.connections.get(node).map_or(0, |connections| connections.len())
    }

    /// Get nodes sorted by degree (most connected first)
    pub fn get_nodes_by_degree(&self) -> Vec<(Pubkey, usize)> {
        let mut node_degrees: Vec<_> = self.nodes
            .iter()
            .map(|&node| (node, self.get_node_degree(&node)))
            .collect();
        
        node_degrees.sort_by_key(|(_, degree)| std::cmp::Reverse(*degree));
        node_degrees
    }
}

/// Network statistics structure
#[derive(Debug, Clone)]
pub struct NetworkStats {
    pub total_nodes: u64,
    pub total_connections: u64,
    pub density: f64,
    pub clustering_coefficient: f64,
    pub average_path_length: f64,
    pub largest_component_size: u64,
    pub isolated_agents_count: u64,
    pub bridge_agents_count: u64,
}

impl NetworkStats {
    /// Check if the network is well-connected
    pub fn is_well_connected(&self) -> bool {
        self.density > 0.1 && 
        self.clustering_coefficient > 0.2 && 
        self.average_path_length < 6.0 &&
        self.isolated_agents_count == 0
    }

    /// Get network health score (0.0 to 1.0)
    pub fn health_score(&self) -> f64 {
        let density_score = (self.density * 2.0).min(1.0);
        let clustering_score = (self.clustering_coefficient * 2.0).min(1.0);
        let path_score = if self.average_path_length > 0.0 && self.average_path_length < f64::INFINITY {
            (10.0 / self.average_path_length).min(1.0)
        } else {
            0.0
        };
        let isolation_score = if self.total_nodes > 0 {
            1.0 - (self.isolated_agents_count as f64 / self.total_nodes as f64)
        } else {
            1.0
        };
        
        (density_score + clustering_score + path_score + isolation_score) / 4.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_network() -> NetworkTopology {
        let nodes = vec![
            Pubkey::new_unique(),
            Pubkey::new_unique(),
            Pubkey::new_unique(),
            Pubkey::new_unique(),
        ];
        
        let mut connections = HashMap::new();
        
        // Create a simple connected graph: 0-1-2-3
        let mut conn0 = HashSet::new();
        conn0.insert(nodes[1]);
        connections.insert(nodes[0], conn0);
        
        let mut conn1 = HashSet::new();
        conn1.insert(nodes[0]);
        conn1.insert(nodes[2]);
        connections.insert(nodes[1], conn1);
        
        let mut conn2 = HashSet::new();
        conn2.insert(nodes[1]);
        conn2.insert(nodes[3]);
        connections.insert(nodes[2], conn2);
        
        let mut conn3 = HashSet::new();
        conn3.insert(nodes[2]);
        connections.insert(nodes[3], conn3);
        
        NetworkTopology::new(nodes, connections)
    }

    #[test]
    fn test_distance_calculation() {
        let agent1 = Pubkey::new_unique();
        let agent2 = Pubkey::new_unique();
        
        let distance = calculate_distance(&agent1, &agent2);
        assert!(distance >= 1 && distance <= 10);
        
        // Same agent should have distance 0 or 1 (due to normalization)
        let distance_same = calculate_distance(&agent1, &agent1);
        assert_eq!(distance_same, 1); // Normalized minimum
    }

    #[test]
    fn test_network_density() {
        let network = create_test_network();
        let density = network.calculate_density();
        
        // With 4 nodes and 3 edges, density should be 3 / (4*3/2) = 3/6 = 0.5
        assert!((density - 0.5).abs() < 0.01);
    }

    #[test]
    fn test_find_nearby_agents() {
        let network = create_test_network();
        let reference = network.nodes[0];
        
        let nearby = network.find_nearby_agents(&reference, 10, Some(2));
        assert!(nearby.len() <= 2);
    }

    #[test]
    fn test_isolated_agents() {
        let mut nodes = vec![
            Pubkey::new_unique(),
            Pubkey::new_unique(),
            Pubkey::new_unique(),
        ];
        
        let mut connections = HashMap::new();
        
        // Connect only first two nodes
        let mut conn0 = HashSet::new();
        conn0.insert(nodes[1]);
        connections.insert(nodes[0], conn0);
        
        let mut conn1 = HashSet::new();
        conn1.insert(nodes[0]);
        connections.insert(nodes[1], conn1);
        
        // Third node is isolated
        connections.insert(nodes[2], HashSet::new());
        
        let network = NetworkTopology::new(nodes.clone(), connections);
        let isolated = network.get_isolated_agents();
        
        assert_eq!(isolated.len(), 1);
        assert!(isolated.contains(&nodes[2]));
    }

    #[test]
    fn test_network_stats() {
        let network = create_test_network();
        let stats = network.get_network_stats();
        
        assert_eq!(stats.total_nodes, 4);
        assert_eq!(stats.total_connections, 6); // 3 bidirectional edges = 6 total connections
        assert!(stats.density > 0.0);
        assert!(stats.average_path_length > 0.0);
        assert_eq!(stats.largest_component_size, 4);
        assert_eq!(stats.isolated_agents_count, 0);
    }

    #[test]
    fn test_network_modification() {
        let mut network = create_test_network();
        let original_node_count = network.nodes.len();
        
        // Add a new node
        let new_node = Pubkey::new_unique();
        network.add_node(new_node, Some(1.0));
        assert_eq!(network.nodes.len(), original_node_count + 1);
        
        // Connect it to an existing node
        network.add_connection(new_node, network.nodes[0]).unwrap();
        assert_eq!(network.get_node_degree(&new_node), 1);
        
        // Remove the node
        network.remove_node(&new_node);
        assert_eq!(network.nodes.len(), original_node_count);
    }

    #[test]
    fn test_health_score() {
        let network = create_test_network();
        let stats = network.get_network_stats();
        let health = stats.health_score();
        
        assert!(health >= 0.0 && health <= 1.0);
        assert!(health > 0.5); // Should be reasonably healthy for connected network
    }
} 