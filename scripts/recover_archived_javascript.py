"""Recover executable source from the preserved CodeRepos Trac file pages."""
from html.parser import HTMLParser
import re


class _CodeTableParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.table_depth = 0
        self.tables = 0
        self.cell = None
        self.lines = []
        self.line_numbers = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if tag == "table":
            if self.table_depth:
                self.table_depth += 1
            elif "code" in attributes.get("class", "").split():
                self.table_depth = 1
                self.tables += 1
        if not self.table_depth:
            return
        if tag == "th" and re.fullmatch(r"L\d+", attributes.get("id", "")):
            self.line_numbers.append(int(attributes["id"][1:]))
        if tag == "td":
            if self.cell is not None:
                raise ValueError("nested source cells in archived JavaScript")
            self.cell = []

    def handle_endtag(self, tag):
        if tag == "td" and self.cell is not None:
            self.lines.append("".join(self.cell).replace("\u00a0", " "))
            self.cell = None
        if tag == "table" and self.table_depth:
            self.table_depth -= 1

    def handle_data(self, data):
        if self.cell is not None:
            self.cell.append(data)


def recover_archived_javascript(source: str) -> str:
    if not source.lstrip().lower().startswith(("<!doctype html", "<html")):
        return source
    parser = _CodeTableParser()
    parser.feed(source)
    parser.close()
    if (parser.tables != 1 or not parser.lines or parser.table_depth or parser.cell is not None
            or parser.line_numbers != list(range(1, len(parser.lines) + 1))):
        raise ValueError("archived JavaScript must contain one complete numbered Trac code table")
    return "\n".join(parser.lines) + "\n"
