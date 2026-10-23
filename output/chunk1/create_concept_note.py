from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

OUT = r"output/chunk1/Faculty_Concept_Note_ZTA_AI_Interview_v2.docx"

doc = Document()
sec = doc.sections[0]
sec.page_height = Inches(11.69)
sec.page_width = Inches(8.27)
sec.top_margin = Inches(0.52)
sec.bottom_margin = Inches(0.48)
sec.left_margin = Inches(0.63)
sec.right_margin = Inches(0.63)

styles = doc.styles
normal = styles["Normal"]
normal.font.name = "Aptos"
normal._element.rPr.rFonts.set(qn("w:ascii"), "Aptos")
normal._element.rPr.rFonts.set(qn("w:hAnsi"), "Aptos")
normal.font.size = Pt(9.25)
normal.paragraph_format.space_after = Pt(3.5)
normal.paragraph_format.line_spacing = 1.03

title_style = styles["Title"]
title_style.font.name = "Aptos Display"
title_style._element.rPr.rFonts.set(qn("w:ascii"), "Aptos Display")
title_style._element.rPr.rFonts.set(qn("w:hAnsi"), "Aptos Display")
title_style.font.size = Pt(18)
title_style.font.bold = True
title_style.font.color.rgb = RGBColor(0, 0, 0)
title_style.paragraph_format.space_after = Pt(4)
title_style_ppr = title_style._element.get_or_add_pPr()
title_style_border = title_style_ppr.find(qn("w:pBdr"))
if title_style_border is not None:
    title_style_ppr.remove(title_style_border)

for style_name in ("Heading 1", "Heading 2"):
    st = styles[style_name]
    st.font.name = "Aptos Display"
    st._element.rPr.rFonts.set(qn("w:ascii"), "Aptos Display")
    st._element.rPr.rFonts.set(qn("w:hAnsi"), "Aptos Display")
    st.font.color.rgb = RGBColor(0, 0, 0)
    st.font.bold = True
    st.paragraph_format.keep_with_next = True
styles["Heading 1"].font.size = Pt(11)
styles["Heading 1"].paragraph_format.space_before = Pt(5)
styles["Heading 1"].paragraph_format.space_after = Pt(2)


def add_text(text, bold_lead=None):
    p = doc.add_paragraph()
    if bold_lead and text.startswith(bold_lead):
        r = p.add_run(bold_lead)
        r.bold = True
        p.add_run(text[len(bold_lead):])
    else:
        p.add_run(text)
    return p


def add_bullet(text):
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.left_indent = Inches(0.20)
    p.paragraph_format.first_line_indent = Inches(-0.14)
    p.paragraph_format.space_after = Pt(1.5)
    p.paragraph_format.line_spacing = 1.0
    p.add_run(text)
    return p


title = doc.add_paragraph(style="Title")
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
title.add_run("Extending Zero Trust Policy Enforcement to AI Powered Interview Systems")
title_ppr = title._p.get_or_add_pPr()
title_border = title_ppr.find(qn("w:pBdr"))
if title_border is not None:
    title_ppr.remove(title_border)

subtitle = doc.add_paragraph()
subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
subtitle.paragraph_format.space_after = Pt(5)
r = subtitle.add_run("Concept note on access security bias risk and grounding assurance")
r.bold = True
r.font.size = Pt(10.5)

meta = doc.add_table(rows=2, cols=2)
meta.alignment = WD_TABLE_ALIGNMENT.CENTER
meta.autofit = False
meta.columns[0].width = Inches(3.45)
meta.columns[1].width = Inches(3.45)
meta.cell(0, 0).text = "Research team  Sai Pranavi A P  Sai Triveni B"
meta.cell(0, 1).text = "Research team  Sanjana H V  Sneha V"
meta.cell(1, 0).text = "Faculty guide  Apoorva Chate"
meta.cell(1, 1).text = "Proposed study  Architecture and prototype evaluation"
for row in meta.rows:
    for cell in row.cells:
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        tcPr = cell._tc.get_or_add_tcPr()
        shd = OxmlElement("w:shd")
        shd.set(qn("w:fill"), "F3F6F8")
        tcPr.append(shd)
        for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
            borders = tcPr.first_child_found_in("w:tcBorders")
            if borders is None:
                borders = OxmlElement("w:tcBorders")
                tcPr.append(borders)
            el = OxmlElement(f"w:{edge}")
            el.set(qn("w:val"), "single")
            el.set(qn("w:sz"), "3")
            el.set(qn("w:color"), "D9D9D9")
            borders.append(el)
        cell.paragraphs[0].paragraph_format.space_after = Pt(0)
        for run in cell.paragraphs[0].runs:
            run.font.size = Pt(8.4)

doc.add_paragraph("Research problem", style="Heading 1")
add_text(
    "AI-powered interview systems process identity data, resumes, answers and assessment records while generating questions, evaluations and scores that may influence employment decisions. Conventional access controls protect logins or endpoints but do not determine whether an AI-generated artifact is sufficiently grounded, non-discriminatory and safe to release. Conversely, standalone content filters do not protect candidate resources from unauthorized or cross-candidate access. The research problem is therefore to enforce explicit trust decisions across both the application workflow and the AI output lifecycle."
)

doc.add_paragraph("Research gap", style="Heading 1")
add_text(
    "Zero Trust Architecture provides a mature model for resource-focused, per-request authentication and authorization, while responsible-AI frameworks treat harmful bias, confabulation, information integrity and human oversight as system risks. Existing hiring studies also show demographic sensitivity, weak agreement between model and human ratings, and vulnerability to resume prompt injection. These areas are usually evaluated separately. This work studies their integration through a common evidence, policy, enforcement and audit structure for an AI interview workflow."
)

doc.add_paragraph("Proposed approach", style="Heading 1")
add_text(
    "We propose a dual-policy assurance architecture. The access-assurance plane applies Zero Trust principles to candidate, recruiter, session, report and model-service resources. A Policy Decision Point evaluates verified identity, role, tenant, ownership, session and contextual evidence, and a Policy Enforcement Point allows or denies each operation. The AI-output-assurance plane evaluates generated questions and assessments for sensitive-content risk, resume grounding, unsupported claims and prompt-injection indicators before the artifact can be released, persisted or used in scoring. Its decisions are allow, regenerate, abstain, require human review or deny. Both planes produce traceable audit evidence."
)

doc.add_paragraph("Research objectives", style="Heading 1")
add_bullet("Design a resource-level Zero Trust policy model for the end-to-end AI interview workflow.")
add_bullet("Integrate bias-risk, grounding and integrity evidence into enforceable AI-output decisions.")
add_bullet("Measure security enforcement, detector errors, subgroup and counterfactual behavior, and system overhead.")
add_bullet("Compare the complete architecture with access-only, output-assurance-only and unprotected baselines.")

doc.add_paragraph("Expected contribution and scope", style="Heading 1")
add_text(
    "The expected contribution is an implementable and reproducible architecture showing how Zero Trust access decisions and AI-output assurance decisions can operate together in a high-impact interview application. The prototype is a decision-support system, not an autonomous hiring authority. Resume grounding indicates whether evidence is present in the submitted resume; it does not prove external truth. Sensitive-content screening does not by itself establish fairness, which will be evaluated through paired counterfactual and subgroup tests. Claims will be limited to the frozen prototype, labeled datasets and measured results."
)

refs = doc.add_paragraph()
refs.paragraph_format.space_before = Pt(4)
refs.paragraph_format.space_after = Pt(0)
rr = refs.add_run(
    "Foundation  NIST SP 800-207 Zero Trust Architecture  |  NIST AI 600-1 Generative AI Profile  |  EU AI Act employment high-risk use case  |  JobFair EMNLP 2024  |  ACL 2026 resume prompt-injection study"
)
rr.font.size = Pt(7.3)
rr.font.color.rgb = RGBColor(65, 65, 65)

doc.core_properties.title = "Extending Zero Trust Policy Enforcement to AI Powered Interview Systems"
doc.core_properties.subject = "Faculty concept note for Zero Trust bias risk and grounding assurance research"
doc.core_properties.author = "Sai Pranavi A P; Sai Triveni B; Sanjana H V; Sneha V"
doc.save(OUT)
print(OUT)
