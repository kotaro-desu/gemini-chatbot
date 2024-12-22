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

    

def askGPT_prefix(question,search_ans,character_info):
    response = openai.chat.completions.create(
        model="sol-gpt4-32k-token20k",
        messages=[
            {"role": "user", "content": "情報に不足なく日本語で文章を補完してください"},
            {"role": "user", "content": character_info},
            {"role":"user","content": search_ans},
            {"role": "user", "content": question},
        ]
    )
    return response.choices[0].message.content

def askGPT_nonprefix(question,search_ans):
    response = openai.chat.completions.create(
        model="sol-gpt4-32k-token20k",
        messages=[
            {"role": "user", "content": "情報に不足なく日本語で文章を補完してください"},
            {"role":"user","content":search_ans},
            {"role": "user", "content": question},
        ]
    )
    return response.choices[0].message.content

soushi = "荘司幸一郎とはどんなん人物ですか？"

@app.post("/api/llm")
async def gpt_response(request: Request):
    try:
        body = await request.json()
        message = body.get("message")
        group = body.get("group")

        print("message: " + message)
        print("---------------------------------------------------------")

        if group==1:
            character,ch_score = questionAiSearch(soushi)
            ai_search, ai_score = questionAiSearch(message)
            ai_score = float(ai_score)
            ai_search = character+"\n\n"+ai_search
            print(ai_search)
            print(ai_score)
            return {"message": ai_search, "score": ai_score}
        else:
            ai_search, ai_score=questionAiSearch(message)
            ai_score = float(ai_score)
            print(ai_search)
            print(ai_score)
            return {"message": ai_search, "score": ai_score}

    except Exception as e:
        print(f"Error: {e}")
        return {"message": "エラーが発生しました。", "error": str(e)}, 500