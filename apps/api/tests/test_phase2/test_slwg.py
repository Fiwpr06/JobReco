
import pytest
import torch
from app.ml.hgat.slwg import SLWGComputer

class MockSkill:
    def __init__(self, name, tier):
        self.name = name
        self.learnability_tier = tier

@pytest.fixture
def slwg():
    return SLWGComputer()

def test_slwg_missing_hard_skill(slwg):
    """Thiếu hard skill → penalty = 0.7 (Equation 2)"""
    cv_skills = {1, 2}  # Sc
    skill_ids_tensor = torch.tensor([99])
    skill_tier_list = ["hard"]
    result = slwg.compute_bias_tensor(cv_skills, skill_ids_tensor, skill_tier_list)
    assert abs(result.bias_tensor[0].item() - 0.7) < 1e-6, \
        f"Hard skill penalty sai: {result.bias_tensor[0].item()}, cần 0.7"

def test_slwg_missing_medium_skill(slwg):
    """Thiếu medium skill → penalty = 0.3"""
    cv_skills = {1, 2}
    skill_ids_tensor = torch.tensor([99])
    skill_tier_list = ["medium"]
    result = slwg.compute_bias_tensor(cv_skills, skill_ids_tensor, skill_tier_list)
    assert abs(result.bias_tensor[0].item() - 0.3) < 1e-6

def test_slwg_missing_easy_skill(slwg):
    """Thiếu easy skill → penalty = 0.1"""
    cv_skills = {1, 2}
    skill_ids_tensor = torch.tensor([99])
    skill_tier_list = ["easy"]
    result = slwg.compute_bias_tensor(cv_skills, skill_ids_tensor, skill_tier_list)
    assert abs(result.bias_tensor[0].item() - 0.1) < 1e-6

def test_slwg_has_skill_no_penalty(slwg):
    """Có skill → penalty = 0 (Equation 1: s ∈ Sc)"""
    cv_skills = {1, 2, 99}  # Có skill 99
    skill_ids_tensor = torch.tensor([99])
    skill_tier_list = ["easy"]
    result = slwg.compute_bias_tensor(cv_skills, skill_ids_tensor, skill_tier_list)
    assert result.bias_tensor[0].item() == 0.0, \
        f"Skill đã có phải penalty=0, got {result.bias_tensor[0].item()}"

def test_slwg_hard_penalty_bigger_than_easy(slwg):
    """Hard skill penalty > medium > easy (SLWG core property)"""
    cv_skills = set()  # Không có skill nào
    result_hard = slwg.compute_bias_tensor(cv_skills, torch.tensor([1]), ["hard"])
    result_medium = slwg.compute_bias_tensor(cv_skills, torch.tensor([2]), ["medium"])
    result_easy = slwg.compute_bias_tensor(cv_skills, torch.tensor([3]), ["easy"])

    assert result_hard.bias_tensor[0] > result_medium.bias_tensor[0] > result_easy.bias_tensor[0], \
        "SLWG: hard penalty phải > medium > easy"

def test_slwg_missing_required_vs_preferred(slwg):
    """Missing required và preferred phải được phân biệt"""
    cv_skills = set()
    edges = [
        (1, 1, MockSkill("Python", "medium"), True),   # required
        (1, 2, MockSkill("Docker", "medium"), False),  # preferred
    ]
    result = slwg.compute_advisory(cv_skills, edges)
    assert len(result.missing_required) == 1
    assert len(result.missing_preferred) == 1
    assert result.missing_required[0]['skill'] == 'Python'
    assert result.missing_preferred[0]['skill'] == 'Docker'

def test_slwg_suggestion_per_tier(slwg):
    """Mỗi tier phải có suggestion text"""
    cv_skills = set()
    for tier in ['easy', 'medium', 'hard']:
        edges = [(1, 1, MockSkill("TestSkill", tier), True)]
        result = slwg.compute_advisory(cv_skills, edges)
        assert result.missing_required[0].get('suggestion'), \
            f"Thiếu suggestion cho tier '{tier}'"
