import React, { useState, useMemo } from 'react';
import { useScanautoDetections } from '../util/db';
import { formatDistanceToNow } from 'date-fns';

const Detections = () => {
    const { data, isLoading, error } = useScanautoDetections(100);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
    const [filter, setFilter] = useState({ isScanauto: 'all', confidence: 0 });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const sortedData = useMemo(() => {
        let sortableItems = [...(data || [])];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [data, sortConfig]);

    const filteredData = useMemo(() => {
        return sortedData.filter(item => {
            const isScanautoMatch = filter.isScanauto === 'all' || 
                (filter.isScanauto === 'yes' && item.analyzer_result.is_scanauto) ||
                (filter.isScanauto === 'no' && !item.analyzer_result.is_scanauto);
            const confidenceMatch = item.analyzer_result.confidence * 100 >= filter.confidence;
            return isScanautoMatch && confidenceMatch;
        });
    }, [sortedData, filter]);

    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredData.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredData, currentPage]);

    const pageCount = Math.ceil(filteredData.length / itemsPerPage);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return <div className="text-red-500 text-center p-4 bg-red-100 rounded-lg">Error: {error.message}</div>;
    }

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Scanauto Detections</h2>
            <div className="mb-6 flex flex-wrap items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <label className="flex items-center">
                    <span className="mr-2 text-gray-700">Is Scanauto:</span>
                    <select 
                        className="form-select block w-full mt-1 rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                        value={filter.isScanauto} 
                        onChange={e => setFilter({...filter, isScanauto: e.target.value})}
                    >
                        <option value="all">All</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                    </select>
                </label>
                <label className="flex items-center">
                    <span className="mr-2 text-gray-700">Min Confidence:</span>
                    <input 
                        type="number" 
                        className="form-input block w-24 mt-1 rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                        value={filter.confidence} 
                        onChange={e => setFilter({...filter, confidence: Number(e.target.value)})}
                    />
                </label>
            </div>
            <div className="overflow-x-auto bg-white shadow-md rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Image
                            </th>
                            <th 
                                scope="col" 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                onClick={() => requestSort('timestamp')}
                            >
                                Time {sortConfig.key === 'timestamp' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Time Ago
                            </th>
                            <th 
                                scope="col" 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                onClick={() => requestSort('analyzer_result.is_scanauto')}
                            >
                                Is Scanauto {sortConfig.key === 'analyzer_result.is_scanauto' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                            </th>
                            <th 
                                scope="col" 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                onClick={() => requestSort('analyzer_result.confidence')}
                            >
                                Confidence {sortConfig.key === 'analyzer_result.confidence' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Description
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedData.map((detection) => (
                            <tr key={detection.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <img src={detection.cropped_image_url} alt="Detected vehicle" className="h-20 w-auto object-cover rounded-md"/>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(detection.timestamp.seconds * 1000).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {formatDistanceToNow(new Date(detection.timestamp.seconds * 1000))} ago
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${detection.analyzer_result.is_scanauto ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {detection.analyzer_result.is_scanauto ? 'Yes' : 'No'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {(detection.analyzer_result.confidence * 100).toFixed(2)}%
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {detection.analyzer_result.description}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-4 flex justify-between items-center">
                <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Previous
                </button>
                <span className="text-sm text-gray-700">
                    Page {currentPage} of {pageCount}
                </span>
                <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, pageCount))}
                    disabled={currentPage === pageCount}
                    className="px-4 py-2 border rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export default Detections;