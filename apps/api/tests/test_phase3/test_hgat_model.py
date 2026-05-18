
import torch
import pytest
from app.ml.hgat.model import CVConditionedHGAT
from app.ml.hgat.slwg import SLWGComputer

@pytest.fixture
def graph():
    return torch.load("data/graph.pt")

@pytest.fixture
def model(graph):
    edge_types = list(graph.edge_types)
    node_counts = {nt: graph[nt].x.shape[0] for nt in graph.node_types}
    return CVConditionedHGAT(
        in_dim=384, hidden_dim=128, num_heads=4,
        num_layers=2, dropout=0.2, edge_types=edge_types,
        node_counts=node_counts
    )

def test_model_forward_pass(model, graph):
    """Forward pass không được throw exception"""
    cv_embedding = torch.randn(384)
    cv_skill_ids = {1, 2, 5}  # Giả lập Sc
    slwg = SLWGComputer()

    node_embeds, c_prime = model(graph, cv_embedding, cv_skill_ids, slwg)

    assert 'job' in node_embeds
    assert node_embeds['job'].shape == (500, 128), \
        f"Job embeddings shape sai: {node_embeds['job'].shape}"
    assert c_prime.shape == (128,), \
        f"CV projected embedding sai: {c_prime.shape}, cần (128,)"

def test_model_score_range(model, graph):
    """score(c,j) = cos(c', h_j) phải trong [-1, 1]"""
    cv_embedding = torch.randn(384)
    slwg = SLWGComputer()
    node_embeds, c_prime = model(graph, cv_embedding, set(), slwg)
    job_embeds = node_embeds['job']

    score = model.score(c_prime, job_embeds)
    assert score.shape == (500,)
    assert score.min() >= -1.01 and score.max() <= 1.01, \
        f"Scores nằm ngoài [-1,1]: min={score.min():.3f}, max={score.max():.3f}"

def test_slwg_affects_job_ranking(model, graph):
    """CV với ít skills hơn phải nhận penalty và rank khác"""
    slwg = SLWGComputer()
    cv_emb = torch.randn(384)

    # CV với nhiều skills (ít penalty)
    _, c1 = model(graph, cv_emb, {1, 2, 3, 4, 5, 6, 7, 8, 9, 10}, slwg)
    # CV với ít skills (nhiều penalty)
    _, c2 = model(graph, cv_emb, set(), slwg)

    scores1 = model.score(c1, model(graph, cv_emb, {1,2,3,4,5,6,7,8,9,10}, slwg)[0]['job'])
    scores2 = model.score(c2, model(graph, cv_emb, set(), slwg)[0]['job'])

    top5_1 = scores1.topk(5).indices.tolist()
    top5_2 = scores2.topk(5).indices.tolist()

    # Top-5 kết quả phải khác nhau (SLWG có ảnh hưởng)
    overlap = len(set(top5_1) & set(top5_2))
    assert overlap < 5, \
        "SLWG không ảnh hưởng đến ranking — kiểm tra lại bias injection"

def test_cv_conditioning_affects_scores(model, graph):
    """Hai CV khác nhau phải ra rankings khác nhau (CV conditioning)"""
    slwg = SLWGComputer()
    cv1 = torch.randn(384)
    cv2 = torch.randn(384)
    skills = {1, 2, 3}

    _, c1 = model(graph, cv1, skills, slwg)
    _, c2 = model(graph, cv2, skills, slwg)

    embeds1 = model(graph, cv1, skills, slwg)[0]['job']
    embeds2 = model(graph, cv2, skills, slwg)[0]['job']

    scores1 = model.score(c1, embeds1).topk(10).indices.tolist()
    scores2 = model.score(c2, embeds2).topk(10).indices.tolist()

    overlap = len(set(scores1) & set(scores2))
    # Rankings của 2 CV khác nhau không được hoàn toàn giống nhau
    assert overlap < 10, \
        "CV conditioning không hoạt động — 2 CVs khác nhau cho cùng ranking"

def test_xavier_initialization(model):
    """Params phải được khởi tạo bằng Xavier (không phải zeros/ones)"""
    # a_src, a_tgt không được là tensor zeros
    assert not torch.all(model.a_src == 0), "a_src bị initialize bằng zeros"
    assert not torch.all(model.a_tgt == 0), "a_tgt bị initialize bằng zeros"

def test_no_leaky_relu_in_attention(model):
    """HGAT phải dùng linear attention, không có LeakyReLU trong attention score"""
    import inspect
    source = inspect.getsource(model._attention_logits)
    assert "LeakyReLU" not in source and "leaky_relu" not in source, \
        "_attention_logits không được dùng LeakyReLU (paper spec: linear attention)"
