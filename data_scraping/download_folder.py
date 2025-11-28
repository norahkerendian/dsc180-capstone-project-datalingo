import requests
import os

TOKEN = "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"

headers = {
    "Accept": "application/vnd.github.v3+json",
    "Authorization": f"Bearer {TOKEN}"
}

def download(url, path):
    r = requests.get(url, headers=headers)
    r.raise_for_status()
    data = r.json()

    for item in data:
        if item["type"] == "file":
            print("Downloading:", item["path"])
            file_data = requests.get(item["download_url"], headers=headers).content
            with open(os.path.join(path, item["name"]), "wb") as f:
                f.write(file_data)

        elif item["type"] == "dir":
            new_path = os.path.join(path, item["name"])
            os.makedirs(new_path, exist_ok=True)
            download(item["url"], new_path)


# root URL for the commit you want
url = "https://api.github.com/repos/data-8/textbook/contents/chapters?ref=2663433dc401a6767bc2f6cf66e710e4166edd50"

os.makedirs("chapters", exist_ok=True)
download(url, "chapters")
