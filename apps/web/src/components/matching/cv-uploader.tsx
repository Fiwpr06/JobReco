"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, File as FileIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CVUploaderProps {
  onUploadStart: (file: File) => void;
}

export function CVUploader({ onUploadStart }: CVUploaderProps) {
  const [file, setFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"]
    },
    maxFiles: 1,
    multiple: false,
  });

  const handleAnalyze = () => {
    if (file) {
      onUploadStart(file);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-black border border-[#333] rounded-xl shadow-xl">
      <h2 className="text-xl font-bold font-mono text-[#00ff00] mb-4 text-center">
        UPLOAD RESUME
      </h2>
      
      {!file ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
            isDragActive ? "border-[#00ff00] bg-[#00ff00]/10" : "border-[#333] hover:border-[#555] hover:bg-[#111]"
          }`}
        >
          <input {...getInputProps()} />
          <UploadCloud className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-300 font-medium">
            Drag & drop your CV here, or click to select
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Supports PDF and DOCX formats up to 10MB
          </p>
        </div>
      ) : (
        <div className="bg-[#111] border border-[#333] rounded-lg p-6 flex flex-col items-center">
          <div className="flex items-center space-x-4 mb-6 w-full justify-between bg-black p-4 rounded border border-[#222]">
            <div className="flex items-center space-x-3 truncate">
              <FileIcon className="w-8 h-8 text-[#00ff00]" />
              <div className="truncate">
                <p className="text-sm font-medium text-white truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
            <button onClick={() => setFile(null)} className="text-gray-500 hover:text-red-500 transition-colors p-2">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <Button 
            onClick={handleAnalyze}
            className="w-full bg-[#00ff00] text-black hover:bg-[#00cc00] font-bold text-lg h-12"
          >
            BẮT ĐẦU PHÂN TÍCH BẰNG HỆ THỐNG
          </Button>
        </div>
      )}
    </div>
  );
}
