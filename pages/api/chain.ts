import { OpenAI } from "langchain/llms/openai";
import { LLMChain, ConversationalRetrievalQAChain, loadQAChain } from "langchain/chains";
import { HNSWLib } from "langchain/vectorstores/hnswlib";
import { PromptTemplate } from "langchain/prompts";

const CONDENSE_PROMPT = PromptTemplate.fromTemplate(`Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.

Chat History:
{chat_history}
Follow Up Input: {question}
Standalone question:`);

const QA_PROMPT = PromptTemplate.fromTemplate(
  `You are an AI assistant for the open source library LangChain. The documentation is located at https://langchain.readthedocs.io.
You are given the following extracted parts of a long document and a question. Provide a conversational answer with a hyperlink to the documentation.
You should only use hyperlinks that are explicitly listed as a source in the context. Do NOT make up a hyperlink that is not listed.
If the question includes a request for code, provide a code block directly from the documentation.
If you don't know the answer, just say "Hmm, I'm not sure." Don't try to make up an answer.
If the question is not about LangChain, politely inform them that you are tuned to only answer questions about LangChain.
Question: {question}
=========
{context}
=========
Answer in Markdown:`);

export const makeChain = (
  vectorstore: HNSWLib, onTokenStream: (token: string) => void) => {
  const questionGenerator = new LLMChain({
    llm: new OpenAI({ 
      temperature: 0,
    }),
    prompt: CONDENSE_PROMPT,
  });

  const docChain = loadQAChain(
    new OpenAI({
      temperature: 0,
      modelName: 'gpt-3.5-turbo-0301',
      streaming: true,
      callbacks: [
        {
          handleLLMNewToken(token: string) {
            onTokenStream(token);
          },
        },
      ],
    }),
    { 
      type: "stuff",
      prompt: QA_PROMPT 
    }
  );

  return new ConversationalRetrievalQAChain({
      retriever: vectorstore.asRetriever(),
      combineDocumentsChain: docChain,
      questionGeneratorChain: questionGenerator,
      returnSourceDocuments: false
    });
}

