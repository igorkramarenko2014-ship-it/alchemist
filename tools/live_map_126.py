import networkx as nx
import matplotlib.pyplot as plt
import numpy as np

def generate_live_map_126():
    """ Renders the Z*127 Core Model Architecture (126 Nodes). """
    G = nx.DiGraph()
    
    # 1. Define the 126 nodes (Z*127 multiplicative group elements)
    nodes = list(range(126))
    G.add_nodes_from(nodes)
    
    # 2. Add edges for Operator A (Order 3) - Step 42
    for n in nodes:
        next_node = (n + 42) % 126
        G.add_edge(n, next_node, color='red', weight=2, label='Operator A (3)')
        
    # 3. Add edges for Operator B (Order 7) - Step 18
    for n in nodes:
        next_node = (n + 18) % 126
        G.add_edge(n, next_node, color='blue', weight=1, label='Operator B (7)')
        
    # 4. Visualization Layout - Circle representation
    pos = {n: (np.cos(2*np.pi*n/126), np.sin(2*np.pi*n/126)) for n in nodes}
    
    plt.figure(figsize=(15, 15))
    
    # Draw edges
    edges = G.edges()
    colors = [G[u][v]['color'] for u, v in edges]
    weights = [G[u][v]['weight'] for u, v in edges]
    
    nx.draw_networkx_edges(G, pos, edge_color=colors, width=weights, alpha=0.3, arrowsize=10)
    
    # Highlight Sync Nodes (those divisible by 21)
    sync_nodes = [n for n in nodes if n % 21 == 0]
    nonsync_nodes = [n for n in nodes if n % 21 != 0]
    
    nx.draw_networkx_nodes(G, pos, nodelist=nonsync_nodes, node_color='gray', node_size=50, alpha=0.5)
    nx.draw_networkx_nodes(G, pos, nodelist=sync_nodes, node_color='green', node_size=300, label='Sync Node (21)')
    
    # Map the hierarchy (conceptual highlights)
    # Panelists: First A-orbit {0, 42, 84}
    panelist_nodes = [0, 42, 84]
    nx.draw_networkx_nodes(G, pos, nodelist=panelist_nodes, node_color='orange', node_size=500, label='Top-Panelist (3)')
    
    # Top-Agents: Orbits of 7 (e.g., 0, 18, 36, 54, 72, 90, 108)
    top_agent_nodes = [(0 + (18 * i)) % 126 for i in range(7)]
    nx.draw_networkx_nodes(G, pos, nodelist=top_agent_nodes, node_color='cyan', node_size=150, alpha=0.8, label='Top-Agent (14/7-cycle)')
    
    plt.title("Z*127 Core Model — 126-Node Live Map\n(Red=A/3, Blue=B/7, Green=Sync/21)", fontsize=20, color='white')
    plt.legend(scatterpoints=1, labelspacing=1.5, frameon=True, fontsize='large')
    plt.axis('off')
    
    # Dark mode aesthetics
    plt.gca().set_facecolor('black')
    plt.gcf().set_facecolor('black')
    
    save_path = "/Users/igorkramarenko/Desktop/Vibe Projects/artifacts/live_map_126_topology.png"
    plt.savefig(save_path, facecolor='black', edgecolor='none')
    print(f"Live Map 126 Topology generated at {save_path}")

if __name__ == "__main__":
    generate_live_map_126()
