import React, { useState } from 'react';
import { Play, Server, Database, Network } from 'lucide-react';

const MapReduceDemo = () => {
  const [inputText, setInputText] = useState('hello world hello distributed systems mapreduce world');
  const [numMappers, setNumMappers] = useState(3);
  const [isRunning, setIsRunning] = useState(false);
  const [chunks, setChunks] = useState([]);
  const [mapResults, setMapResults] = useState([]);
  const [reduceResults, setReduceResults] = useState([]);
  const [finalCounts, setFinalCounts] = useState({});
  const [logs, setLogs] = useState([]);

  const addLog = (message) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const simulateNetworkDelay = () => {
    return new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 300));
  };

  // Master node functionality
  const splitTextIntoChunks = (text, numChunks) => {
    const words = text.trim().split(/\s+/);
    const chunkSize = Math.ceil(words.length / numChunks);
    const result = [];
    
    for (let i = 0; i < numChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, words.length);
      if (start < words.length) {
        result.push({
          id: i,
          text: words.slice(start, end).join(' ')
        });
      }
    }
    
    return result;
  };

  // Mapper node functionality
  const mapFunction = async (chunk) => {
    await simulateNetworkDelay(); // Simulate network communication
    
    const words = chunk.text.toLowerCase().split(/\s+/);
    const wordCount = {};
    
    words.forEach(word => {
      if (word) {
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    });
    
    return {
      mapperId: chunk.id,
      counts: wordCount
    };
  };

  // Shuffle phase - group by key
  const shufflePhase = (mapOutputs) => {
    const grouped = {};
    
    mapOutputs.forEach(output => {
      Object.entries(output.counts).forEach(([word, count]) => {
        if (!grouped[word]) {
          grouped[word] = [];
        }
        grouped[word].push({ mapperId: output.mapperId, count });
      });
    });
    
    return grouped;
  };

  // Reducer node functionality
  const reduceFunction = async (word, values) => {
    await simulateNetworkDelay(); // Simulate network communication
    
    const totalCount = values.reduce((sum, val) => sum + val.count, 0);
    
    return {
      word,
      count: totalCount,
      sources: values.map(v => `Mapper-${v.mapperId}`)
    };
  };

  const runMapReduce = async () => {
    setIsRunning(true);
    setChunks([]);
    setMapResults([]);
    setReduceResults([]);
    setFinalCounts({});
    setLogs([]);

    try {
      // Step 1: Master splits input into chunks
      addLog('🎯 MASTER: Splitting input text into chunks...');
      const textChunks = splitTextIntoChunks(inputText, numMappers);
      setChunks(textChunks);
      addLog(`📦 MASTER: Created ${textChunks.length} chunks`);
      await new Promise(resolve => setTimeout(resolve, 800));

      // Step 2: Send chunks to mapper nodes (simulate HTTP requests)
      addLog('📤 MASTER: Sending chunks to mapper nodes...');
      const mapPromises = textChunks.map(async (chunk) => {
        addLog(`🔵 MAPPER-${chunk.id}: Received chunk via HTTP`);
        return await mapFunction(chunk);
      });
      
      const mapOutputs = await Promise.all(mapPromises);
      setMapResults(mapOutputs);
      
      mapOutputs.forEach(output => {
        addLog(`✅ MAPPER-${output.mapperId}: Completed word count, sending results back`);
      });
      await new Promise(resolve => setTimeout(resolve, 800));

      // Step 3: Shuffle phase (on master)
      addLog('🔄 MASTER: Shuffling and grouping by keys...');
      const shuffled = shufflePhase(mapOutputs);
      addLog(`📊 MASTER: Grouped into ${Object.keys(shuffled).length} unique words`);
      await new Promise(resolve => setTimeout(resolve, 800));

      // Step 4: Send grouped data to reducer nodes
      addLog('📤 MASTER: Distributing grouped data to reducer nodes...');
      const reducePromises = Object.entries(shuffled).map(async ([word, values], idx) => {
        addLog(`🟢 REDUCER-${idx}: Received word "${word}" via HTTP`);
        return await reduceFunction(word, values);
      });

      const reduceOutputs = await Promise.all(reducePromises);
      setReduceResults(reduceOutputs);
      
      // Step 5: Master collects final results
      addLog('📥 MASTER: Collecting final results from reducers...');
      const final = {};
      reduceOutputs.forEach(output => {
        final[output.word] = output.count;
        addLog(`✅ REDUCER: Sent final count for "${output.word}": ${output.count}`);
      });
      
      setFinalCounts(final);
      addLog('🎉 MASTER: MapReduce job completed successfully!');

    } catch (error) {
      addLog(`❌ ERROR: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Database className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-800">Distributed MapReduce Word Count</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Input Text
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows="4"
                placeholder="Enter text to process..."
                disabled={isRunning}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Mappers (Chunks)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={numMappers}
                onChange={(e) => setNumMappers(parseInt(e.target.value))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                disabled={isRunning}
              />
              
              <button
                onClick={runMapReduce}
                disabled={isRunning || !inputText.trim()}
                className="mt-4 w-full bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {isRunning ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Run MapReduce
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Architecture Diagram */}
        <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Network className="w-6 h-6 text-indigo-600" />
            System Architecture
          </h2>
          <div className="flex items-center justify-around flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <Server className="w-12 h-12 text-blue-600 mx-auto mb-2" />
              <div className="font-semibold">Master Node</div>
              <div className="text-sm text-gray-600">Coordinates job</div>
            </div>
            <div className="text-2xl text-gray-400">→</div>
            <div className="text-center">
              <div className="flex gap-2">
                {[...Array(Math.min(numMappers, 3))].map((_, i) => (
                  <Server key={i} className="w-10 h-10 text-green-600" />
                ))}
              </div>
              <div className="font-semibold">Mapper Nodes</div>
              <div className="text-sm text-gray-600">Count words</div>
            </div>
            <div className="text-2xl text-gray-400">→</div>
            <div className="text-center">
              <div className="flex gap-2">
                <Server className="w-10 h-10 text-purple-600" />
                <Server className="w-10 h-10 text-purple-600" />
              </div>
              <div className="font-semibold">Reducer Nodes</div>
              <div className="text-sm text-gray-600">Aggregate counts</div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {chunks.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">1. Input Chunks</h2>
                <div className="space-y-2">
                  {chunks.map((chunk) => (
                    <div key={chunk.id} className="p-3 bg-blue-50 rounded border border-blue-200">
                      <div className="font-semibold text-blue-800">Chunk {chunk.id}</div>
                      <div className="text-sm text-gray-700">{chunk.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mapResults.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">2. Map Phase Results</h2>
                <div className="space-y-2">
                  {mapResults.map((result) => (
                    <div key={result.mapperId} className="p-3 bg-green-50 rounded border border-green-200">
                      <div className="font-semibold text-green-800">Mapper {result.mapperId}</div>
                      <div className="text-sm text-gray-700">
                        {Object.entries(result.counts).map(([word, count]) => (
                          <span key={word} className="inline-block mr-3">
                            {word}: {count}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {reduceResults.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">3. Reduce Phase Results</h2>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {reduceResults.map((result, idx) => (
                    <div key={idx} className="p-3 bg-purple-50 rounded border border-purple-200">
                      <div className="font-semibold text-purple-800">
                        "{result.word}": {result.count}
                      </div>
                      <div className="text-xs text-gray-600">
                        Sources: {result.sources.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Object.keys(finalCounts).length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">4. Final Word Counts</h2>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(finalCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([word, count]) => (
                      <div key={word} className="p-3 bg-indigo-50 rounded border border-indigo-200">
                        <div className="font-bold text-indigo-900">{word}</div>
                        <div className="text-2xl font-bold text-indigo-600">{count}</div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Logs Section */}
        {logs.length > 0 && (
          <div className="bg-gray-900 rounded-lg shadow-lg p-6 mt-6">
            <h2 className="text-xl font-bold text-white mb-4">Network Communication Log</h2>
            <div className="bg-black rounded p-4 h-64 overflow-y-auto font-mono text-sm">
              {logs.map((log, idx) => (
                <div key={idx} className="text-green-400 mb-1">{log}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapReduceDemo;