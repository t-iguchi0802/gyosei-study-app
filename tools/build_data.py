from __future__ import annotations

import json
import re
from pathlib import Path


APP_DIR = Path(__file__).resolve().parents[1]
ROOT = APP_DIR.parents[1]
QUESTION_MD = ROOT / "06_予想模試" / "第1回_問題_完成版.md"
EXPLANATION_MD = ROOT / "06_予想模試" / "第1回_解答解説_完成版.md"
OUT = APP_DIR / "data.js"


def split_questions(text: str) -> dict[int, dict[str, str]]:
    matches = list(re.finditer(r"(?m)^##\s+問題(\d+)([^\r\n]*)$", text))
    out: dict[int, dict[str, str]] = {}
    for i, match in enumerate(matches):
        number = int(match.group(1))
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        out[number] = {
            "title": match.group(2).strip("　 "),
            "body": text[match.end():end].strip(),
        }
    return out


def plain(text: str) -> str:
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    text = re.sub(r"`([^`]*)`", r"\1", text)
    text = re.sub(r"(?m)^>\s?", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def parse_problem(number: int, block: dict[str, str]) -> dict:
    body = block["body"]
    lines = body.splitlines()
    numbered: list[tuple[int, str]] = []
    prompt_lines: list[str] = []
    for raw in lines:
        line = raw.strip()
        if not line or line == "---" or line.startswith("### "):
            continue
        match = re.match(r"^(\d+)[.．]\s*(.*)$", line)
        if match:
            numbered.append((int(match.group(1)), plain(match.group(2))))
        else:
            prompt_lines.append(plain(line))

    if number in (41, 42, 43):
        qtype = "multi"
        options = [{"value": n, "label": text} for n, text in numbered]
        prompt = "\n\n".join(prompt_lines)
        blanks = ["ア", "イ", "ウ", "エ"]
    elif number in (44, 45, 46):
        qtype = "written"
        options = []
        prompt = "\n\n".join(prompt_lines)
        blanks = []
    else:
        qtype = "single"
        options = [{"value": n, "label": text} for n, text in numbered]
        prompt = "\n\n".join(prompt_lines)
        blanks = []

    return {
        "id": number,
        "title": block["title"],
        "type": qtype,
        "prompt": prompt,
        "choices": options,
        "blanks": blanks,
    }


def parse_sections(body: str) -> dict[str, str]:
    matches = list(re.finditer(r"(?m)^###\s+([^\r\n]+)$", body))
    sections: dict[str, str] = {}
    for i, match in enumerate(matches):
        end = matches[i + 1].start() if i + 1 < len(matches) else len(body)
        heading = plain(match.group(1))
        content = body[match.end():end].strip()
        lines = []
        for raw in content.splitlines():
            line = raw.strip()
            if not line:
                if lines and lines[-1] != "":
                    lines.append("")
                continue
            line = re.sub(r"^[-*]\s+", "・", line)
            lines.append(plain(line))
        sections[heading] = "\n".join(lines).strip()
    return sections


def parse_answer(number: int, block: dict[str, str]) -> dict:
    body = block["body"]
    sections = parse_sections(body)
    result: dict = {"sections": sections}
    if number in (41, 42, 43):
        answer_text = sections.get("正解", "")
        result["answer"] = {
            key: int(value)
            for key, value in re.findall(r"([アイウエ])：\s*(\d+)", answer_text)
        }
        result["core"] = sections.get("文章全体の法理", "")
    elif number in (44, 45, 46):
        result["answer"] = sections.get("模範解答", "")
        result["keywords"] = [
            line.lstrip("・").strip()
            for line in sections.get("必須キーワード", "").splitlines()
            if line.strip()
        ]
        result["core"] = sections.get("この問題の核心", "")
    else:
        match = re.search(r"\*\*正解：\s*(\d+)\*\*", body)
        if not match:
            raise ValueError(f"問題{number}: 正解番号を抽出できません")
        result["answer"] = int(match.group(1))
        result["core"] = sections.get("この問題の核心", "")
    return result


def main() -> None:
    q_text = QUESTION_MD.read_text(encoding="utf-8-sig")
    e_text = EXPLANATION_MD.read_text(encoding="utf-8-sig")
    questions = split_questions(q_text)
    explanations = split_questions(e_text)
    if sorted(questions) != list(range(1, 61)):
        raise ValueError("問題ファイルは1～60の連番ではありません")
    if sorted(explanations) != list(range(1, 61)):
        raise ValueError("解説ファイルは1～60の連番ではありません")

    data = []
    for number in range(1, 61):
        item = parse_problem(number, questions[number])
        item.update(parse_answer(number, explanations[number]))
        data.append(item)

    payload = {
        "examId": "gyosei-2026-mock-1",
        "title": "行政書士2026 厳選予想模試 第1回",
        "subtitle": "本命・標準型",
        "timeMinutes": 180,
        "questions": data,
    }
    text = "window.EXAM_DATA = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n"
    OUT.write_text(text, encoding="utf-8")
    print(f"created {OUT} ({len(data)} questions, {OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
