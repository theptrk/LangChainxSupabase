import { serve } from "http/server.ts";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { createClient } from "@supabase/supabase-js";
import { SupabaseHybridSearch } from "langchain/retrievers/supabase";
import { OpenAI } from "langchain/llms/openai";
import { ConversationalRetrievalQAChain } from "langchain/chains";
import { HNSWLib } from "langchain/vectorstores/hnswlib";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { corsHeaders } from "../_shared/cors.ts";

// First, follow set-up instructions at
// https://js.langchain.com/docs/modules/indexes/vector_stores/integrations/supabase

const privateKey = Deno.env.get("SUPABASE_PRIVATE_KEY");
if (!privateKey) throw new Error(`Expected env var SUPABASE_PRIVATE_KEY`);

const url = Deno.env.get("SUPABASE_URL");
if (!url) throw new Error(`Expected env var SUPABASE_URL`);

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }
    try {
        const { query } = await req.json();
        // This is needed if you're planning to invoke your function from a browser.
        const input = query.replace(/\n/g, ' ')

        const client = createClient(url, privateKey);

        const embeddings = new OpenAIEmbeddings();

        const retriever = new SupabaseHybridSearch(embeddings, {
            client,
            similarityK: 2,
            keywordK: 2,
            tableName: "documents",
            similarityQueryName: "match_documents",
            keywordQueryName: "kw_match_documents",
        });

        /* Initialize the LLM to use to answer the question */
        const model = new OpenAI({});
        /* Create the chain */
        const chain = ConversationalRetrievalQAChain.fromLLM(
            model,
            retriever
        );
        /* Ask it a question */
        const question = input;
        const res = await chain.call({ question, chat_history: [] });
        console.log(res);
        // /* Ask it a follow up question */
        // const chatHistory = question + res.text;
        // const followUpRes = await chain.call({
        //     question: "Was that nice?",
        //     chat_history: chatHistory,
        // });
        // console.log(followUpRes);


        return new Response(JSON.stringify(res), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});