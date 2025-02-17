import React, { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from 'next/router';
import axios, { AxiosRequestConfig } from 'axios';
import Header from '@/components/Header';
import Loader from '@/components/Loader';

import "react-quill/dist/quill.snow.css";
import "quill-mention/dist/quill.mention.css";

const PdfViewer = dynamic(import("../components/PdfViewer"), { ssr: false });
const QuillMention = dynamic(import("quill-mention"), { ssr: false });
const ReactQuill = dynamic(import("react-quill"), { ssr: false });

type Documents = {
  id: number;
  content: string;
  file_type: string;
  html_string?: string;
  file_path?: string;
  url?: string;
};

const atValues = [
  { id: 1, value: "At Value 1" },
  { id: 2, value: "At Value 2" },
];
const hashValues = [
  { id: 3, value: "Hash Value 1" },
  { id: 4, value: "Hash Value 2" },
  { id: 5, value: "Story" },
];

const Documents = () => {
  const router = useRouter();

  const fileInput = useRef();

  const [loadingDocs, setLoadingDocs] = useState(true);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<Array<Documents>>([]);
  const [selectedDocument, setSelectedDocument] = useState<Documents>();
  const [value, setValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [selectedPDF, setSelectedPDF] = useState<File | null>();

  useEffect(() => {
    axios.get("/api/document").then(({ data }) => {
      setDocuments(data);
    }).catch(console.error)
      .finally(() => setLoadingDocs(false));
  }, []);

  useEffect(() => {
    if (router.query.id && documents.length > 0) {
      const foundDoc = documents.find(
        (d) => d.id === parseInt(router?.query?.id)
      );
      if (foundDoc) {
        if (foundDoc?.file_type === "PDF") {
          axios.get("/api/upload-pdf", { params: { path: foundDoc?.file_path } }).then(({ data }) => {
            setSelectedDocument({ ...foundDoc, url: data });
          });
        } else {
          setSelectedDocument(foundDoc);
          setValue(foundDoc?.html_string || "");
        }
      }
    }
  }, [router.query, documents]);

  useEffect(() => {
    window.addEventListener(
      "mention-hovered",
      (event) => {
        console.log("hovered: ", event);
      },
      false
    );
    window.addEventListener(
      "mention-clicked",
      (event) => {
        console.log("clicked: ", event);
      },
      false
    );
    return () => {
      window.removeEventListener("mention-hovered", (event) => {
        console.log("hovered: ", event);
      });
      window.removeEventListener("mention-clicked", (event) => {
        console.log("clicked: ", event);
      });
    };
  }, []);

  const goToDocument = (id: number | null) => {
    console.log("null id", id)
    if (!id) {
      console.log("null id")
      router.replace({
        query: {}
      })
      setSelectedDocument(undefined);
      setValue("");
      return;
    }
    const document = documents.find((d) => id === d.id);
    if (document) {
      router.replace({
        query: { id }
      })
    }
  };

  const onDeleteDocument = async () => {
    if (confirmDelete && selectedDocument) {
      setLoading(true);
      try {
        const { data } = await axios.delete(
          `/api/document/${selectedDocument.id}`
        );
        const newDocuments = [...documents];
        newDocuments.splice(
          newDocuments.findIndex((d) => d.id === data[0].id),
          1
        );
        setDocuments(newDocuments);
        setConfirmDelete(false);
        setSelectedDocument(undefined);
        setValue("");
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    } else {
      setConfirmDelete(true);
    }
  };

  const onAddDocument = async () => {
    setLoading(true);

    try {
      if (selectedDocument) {
        const { data } = await axios.put(
          `/api/document/${selectedDocument.id}`,
          {
            value,
          }
        );

        const newDocuments = [...documents];
        newDocuments.splice(
          newDocuments.findIndex((d) => d.id === data[0].id),
          1,
          data[0]
        );
        setDocuments(newDocuments);

        setValue("");
        setSelectedDocument(undefined);
      } else {
        const { data } = await axios.post("/api/document", { value });
        setDocuments([...documents, data[0]]);
        setValue("");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const mentionModule = {
    allowedChars: /^[A-Za-z\sÅÄÖåäö]*$/,
    mentionDenotationChars: ["@", "#"],
    source: useCallback(
      (
        searchTerm: string,
        renderItem: (
          arg0: { id: number; value: string }[] | undefined,
          arg1: any
        ) => void,
        mentionChar: string
      ) => {
        let values;

        if (mentionChar === "@") {
          values = atValues;
        } else if (mentionChar === "#") {
          values = hashValues;
        }

        if (searchTerm.length === 0) {
          renderItem(values, searchTerm);
        } else if (values) {
          const matches = [];
          for (let i = 0; i < values.length; i += 1)
            if (values[i].value.toLowerCase().indexOf(searchTerm.toLowerCase()))
              matches.push(values[i]);
          renderItem(matches, searchTerm);
        }
      },
      []
    ),
  };

  const onUploadPDF = async () => {
    setUploading(true)
    let formData = new FormData();
    formData.append("file", selectedPDF);

    try {
      const config: AxiosRequestConfig = {
        headers: { 'content-type': `multipart/form-data` },
        onUploadProgress: (event) => {
          console.log(`Current progress:`, Math.round((event.loaded * 100) / (event?.total || 0)));
        },
      };

      const { data } = await axios.post("/api/upload-pdf", formData, config)
      setSelectedPDF(undefined);
      setDocuments([...documents, data[0]]);
      fileInput.current.value = "";
    } catch (err) {
      console.log(err)
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="m-8">
      <Header />

      <div className="flex flex-1 items-stretch">
        <div className="w-120 border-r-2 border-slate-400 p-4">
          <button
            className={`${!selectedPDF && "cursor-not-allowed"} bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded whitespace-nowrap cursor-pointer`}
            onClick={() => goToDocument(null)}
          >
            {`Create New Document`}
          </button>
          <ul className="mt-3">
            <li
              className={`border-l-2 ml-2 my-1 hover:border-cyan-300 hover:text-cyan-300 ${!selectedDocument?.id && "border-cyan-500 text-cyan-500"
                }`}
            ></li>
            {loadingDocs ?
              <div className="flex flex-col items-center">
                <Loader className="fill-white" /> Loading Documents
              </div>

              :
              documents.map((d) => {
                let content_lines = d.content.split("\n");
                let title = content_lines[0];
                return (
                  <li
                    key={d.id}
                    className={`border-l-2 pl-2 py-1 hover:border-cyan-300 hover:text-cyan-300 ${selectedDocument?.id === d.id &&
                      "border-cyan-500 text-cyan-500"
                      }`}
                  >
                    <a
                      onClick={() => goToDocument(d.id)}
                      className="whitespace-normal cursor-pointer"
                    >
                      {title}
                    </a>
                  </li>
                );
              })}
          </ul>
        </div>
        <div className="p-4 w-full">
          {
            selectedDocument?.file_type === "PDF" ?
              <PdfViewer
                file={selectedDocument.url || ""}
                pageNumber={parseInt(router?.query?.pageNumber || 1)}
                id={selectedDocument.id}
              />
              :
              <>
                {
                  !selectedDocument && (
                    <div className="text-center">
                      <label className="block mb-4 text-bold">Upload PDF</label>
                      <div className='mb-4 flex flex-row justify-center'>
                        <input ref={fileInput} onChange={(e) => setSelectedPDF(e?.target?.files?.[0])} accept='application/pdf' type='file' />
                        <button
                          disabled={!selectedPDF || uploading}
                          className={`${(!selectedPDF || uploading) && "cursor-not-allowed"} ml-1 block rounded bg-slate-600 px-6 pb-2 pt-2.5 text-xs font-medium uppercase leading-normal text-white`}
                          onClick={onUploadPDF}
                        >
                          <span className="flex items-center">
                            {
                              uploading ? <>
                                <Loader className="mr-2" /> Uploading...
                              </>
                                : "Upload PDF"
                            }
                          </span>
                        </button>
                      </div>
                      <span className="block text-bold text-xl mb-4">-- OR --</span>
                      <label className="block mb-4 text-bold text-center">Create Your Own Document</label>
                    </div>
                  )
                }
                <ReactQuill
                  bounds=".quill"
                  theme="snow"
                  value={value}
                  onChange={setValue}
                  modules={{
                    mention: mentionModule,
                  }}
                />
              </>
          }

          <div>
            {selectedDocument &&
              (confirmDelete ? (
                <div className="float-left block">
                  <span className="text-red-600">
                    {" "}
                    Are you sure you want to delete?{" "}
                  </span>
                  <button
                    className={`mt-2 block rounded bg-red-500 px-6 pb-2 pt-2.5 text-xs font-medium uppercase leading-normal text-white"
                      }`}
                    onClick={onDeleteDocument}
                  >
                    <span className="flex items-center">
                      {loading ? (
                        <>
                          <Loader className="mr-2" /> Processing...
                        </>
                      ) : (
                        "Confirm Delete"
                      )}
                    </span>
                  </button>
                </div>
              ) : (
                <button
                  className="mt-2 float-left inline-block rounded bg-red-500 px-6 pb-2 pt-2.5 text-xs font-medium uppercase leading-normal text-white"
                  onClick={onDeleteDocument}
                >
                  Delete
                </button>
              ))}

            {
              selectedDocument?.file_type !== "PDF" && (
                <button
                  className={`mt-2 float-right inline-block rounded bg-slate-600 px-6 pb-2 pt-2.5 text-xs font-medium uppercase leading-normal text-white ${loading && "cursor-not-allowed"
                    }`}
                  disabled={loading}
                  onClick={onAddDocument}
                >
                  <span className="flex items-center">
                    {loading ? (
                      <>
                        <Loader className="mr-2" /> Processing...
                      </>
                    ) : (
                      "Submit"
                    )}
                  </span>
                </button>
              )
            }
          </div>
        </div>
      </div>
    </div >
  )
}

export default Documents
