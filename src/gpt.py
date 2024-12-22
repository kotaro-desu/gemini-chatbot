import openai
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from azure.core.credentials import AzureKeyCredential
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents import SearchClient

app = FastAPI()

# CORS設定
origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

openai.api_type = "azure"
openai.base_url = ""  # Your Azure OpenAI resource's endpoint value.
openai.api_version = ""
openai.api_key = ""

search_endpoint = ""
search_api_key = ""
index_name = "applebanana-index"
credential = AzureKeyCredential(search_api_key)

# Run an empty query (returns selected fields, all documents)
search_client = SearchClient(endpoint=search_endpoint,
                      index_name=index_name,
                      credential=credential)

def questionAiSearch(qes): 
    results =  search_client.search(
        search_text=qes ,
        query_type="semantic",
        semantic_configuration_name="applebanana-index-semantic-configuration",
        select='chunk',
        include_total_count=True,
        top=1,
        )
    
    for result in results:
        score = result["@search.score"]
        chunk = result["chunk"]

    return chunk, score

def askGPT(question):
    response = openai.chat.completions.create(
        model="sol-gpt4-32k-token20k",
        messages=[
            {"role": "user", "content": question},
        ]
    )
    return response.choices[0].message.content

soushi = "荘司幸一郎とはどんなん人物ですか？"

@app.post("/api/gpt")
async def gpt_response(request: Request):
    try:
        body = await request.json()
        message = body.get("message")

        result = askGPT(message)

        print("gptに接続しています")
        print(result)

        return result
    except:
        print("エラーが発生しました。")
