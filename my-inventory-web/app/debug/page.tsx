'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import qs from 'qs';

// URL ของ API
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337/api';

export default function DebugPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const query = {
          populate: '*', // ดึงทุกอย่างแบบเหวี่ยงแห
          publicationState: 'preview',
          locale: 'all',
        };

        // ใช้ qs สร้าง URL แบบที่ Strapi ชอบ
        const queryString = qs.stringify(query, { encodeValuesOnly: true });
        const fullUrl = `${API_URL}/project-sites?${queryString}`;

        console.log("Fetching URL:", fullUrl); // ดูใน F12 Console

        const res = await axios.get(fullUrl);
        setData(res.data);
      } catch (err: any) {
        setError(err.message + (err.response ? ` : ${JSON.stringify(err.response.data)}` : ''));
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="p-10 font-mono text-sm">
      <h1 className="text-2xl font-bold mb-4 text-red-600">🕵️ Strapi Debugger</h1>
      
      {/* 1. ส่วนแสดง Error ถ้ามี */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* 2. ส่วนแสดงข้อมูลดิบ */}
      {loading ? (
        <p>⏳ Loading data from Strapi...</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          
          {/* ซ้าย: รายชื่อ ID ที่พบ */}
          <div className="bg-gray-100 p-4 rounded shadow">
            <h2 className="font-bold mb-2">✅ IDs Found in Database:</h2>
            {data?.data?.length > 0 ? (
              <ul className="list-disc pl-5">
                {data.data.map((item: any) => (
                  <li key={item.id} className="mb-2">
                    <span className="bg-blue-200 px-2 py-1 rounded font-bold">ID: {item.id}</span>
                    <span className="ml-2 text-gray-600">
                       DocumentId: {item.documentId}
                    </span>
                    <br />
                    <span className="text-green-700">Name: {item.attributes?.name || item.name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-red-500">No data found (Empty Array)</p>
            )}
          </div>

          {/* ขวา: ข้อมูล JSON เต็มๆ */}
          <div className="bg-gray-800 text-green-400 p-4 rounded shadow overflow-auto h-[500px]">
            <h2 className="font-bold mb-2 text-white">📦 Full JSON Response:</h2>
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}