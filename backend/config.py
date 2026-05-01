ai_config = {
    "base_url": None,
    "api_key": None,
    "model": None
}


def set_config(base_url, api_key, model):

    ai_config["base_url"] = base_url
    ai_config["api_key"] = api_key
    ai_config["model"] = model


def get_config():

    return ai_config