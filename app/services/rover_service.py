
import networkx as nx
def shortest_path(graph,start,end):
    return nx.astar_path(graph,start,end)
