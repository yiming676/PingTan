import re


def normalize_phone_digits(phone: str) -> str:
    digits = re.sub(r"\D", "", phone or "")
    if re.fullmatch(r"86\d{11}", digits):
        return digits[2:]
    return digits
