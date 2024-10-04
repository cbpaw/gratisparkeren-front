import React, { useState, useEffect } from "react";
import Meta from "components/Meta";
import { useAuth } from "util/auth";
import { useUser, useQuery } from "util/db";
import { formatDistanceToNow } from "date-fns";
import { doc, setDoc, collection, query, where, orderBy } from "firebase/firestore";
import { firebaseApp } from "../util/firebase";
import { getFirestore } from "firebase/firestore";
import { useScanautoDetections } from "util/db";
import Detections from "components/Detections";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";

function ParkingPage() {
  const db = getFirestore(firebaseApp);
  const { user, updateProfile } = useAuth();
  const { data: userData, status: userStatus } = useUser(user?.uid);
  const [licensePlates, setLicensePlates] = useState([]);
  const [activePlate, setActivePlate] = useState(null);
  const { detections, detectionsStatus } = useScanautoDetections();
  const [newPlate, setNewPlate] = useState("");
  const [selectedPlate, setSelectedPlate] = useState("");
  const [parkingDuration, setParkingDuration] = useState(30);
  const [detectionStatus, setDetectionStatus] = useState("stopped");
  const [parkingStatus, setParkingStatus] = useState(null);
  const [remainingTime, setRemainingTime] = useState(null);

  useEffect(() => {
    if (userStatus === "success" && userData) {
      setLicensePlates(userData.licensePlates || []);
      setActivePlate(userData.activePlate || null);
    }
  }, [userData, userStatus]);

  useEffect(() => {
    const checkDetectionStatus = async () => {
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_APP_SERVER}/detection_status`);
        setDetectionStatus(response.data.detection_active ? "running" : "stopped");
        console.log("Detection status:", response.data.detection_active);
      } catch (error) {
        console.error("Error checking detection status:", error);
      }
    };

    checkDetectionStatus();
    const intervalId = setInterval(checkDetectionStatus, 10000); // Check every 10 seconds

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (activePlate) {
      getParkingStatus();
      const intervalId = setInterval(getParkingStatus, 60000); // Check every minute
      return () => clearInterval(intervalId);
    } else {
      setParkingStatus(null);
      setRemainingTime(null);
    }
  }, [activePlate]);

  const handleAddPlate = async (plate) => {
    if (!user) {
      console.error("User is not authenticated");
      toast.error("User is not authenticated");
      return;
    }

    const updatedLicensePlates = [...licensePlates, plate];

    try {
      await setDoc(doc(db, "users", user.uid), {
        licensePlates: updatedLicensePlates,
      }, { merge: true });

      setLicensePlates(updatedLicensePlates);
      setNewPlate("");
    } catch (error) {
      console.error("Error adding license plate:", error);
      toast.error(`Error adding license plate: ${error.message}`);
    }
  };

  const handleRemovePlate = async (plate) => {
    const updatedLicensePlates = licensePlates.filter((p) => p !== plate);
    try {
      await setDoc(doc(db, "users", user.uid), {
        licensePlates: updatedLicensePlates,
      }, { merge: true });
      setLicensePlates(updatedLicensePlates);
      if (activePlate === plate) {
        setActivePlate(null);
        await setDoc(doc(db, "users", user.uid), { activePlate: null }, { merge: true });
      }
    } catch (error) {
      console.error("Error removing license plate:", error);
      toast.error(`Error removing license plate: ${error.message}`);
    }
  };

  const handleActivatePlate = async (plate) => {
    try {
      await setDoc(doc(db, "users", user.uid), { activePlate: plate }, { merge: true });
      setActivePlate(plate);
    } catch (error) {
      console.error("Error activating license plate:", error);
      toast.error(`Error activating license plate: ${error.message}`);
    }
  };

  const activateParking = async () => {
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_APP_SERVER}/activate_parking`, {
        license_plate: selectedPlate,
        duration_minutes: parkingDuration,
      });
      handleActivatePlate(selectedPlate);
      console.log("Parking started");
      toast.success("Parking activated successfully");
      getParkingStatus();
    } catch (error) {
      console.error("Error activating parking:", error);
      toast.error(`Error activating parking: ${error.response?.data?.message || error.message}`);
    }
  };

  const getParkingStatus = async () => {
    if (!activePlate) return;

    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_APP_SERVER}/parking_status?license_plate=${activePlate}`
      );
      const { status, remaining_time } = response.data;
      setParkingStatus(status);
      setRemainingTime(remaining_time);
      if (status === "active") {
        console.log(`Parking active for ${activePlate}, remaining time: ${remaining_time}`);
      } else {
        console.log(`Parking inactive for ${activePlate}`);
      }
    } catch (error) {
      console.error("Error getting parking status:", error);
      toast.error(`Error getting parking status: ${error.response?.data?.message || error.message}`);
    }
  };

  const startDetection = async () => {
    try {
      setDetectionStatus("starting");
      await axios.post(`${process.env.NEXT_PUBLIC_APP_SERVER}/start_detection`);
      setDetectionStatus("running");
      toast.success("Detection started successfully");
    } catch (error) {
      console.error("Error starting detection:", error);
      toast.error(`Error starting detection: ${error.response?.data?.message || error.message}`);
      setDetectionStatus("stopped");
    }
  };

  const stopDetection = async () => {
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_APP_SERVER}/stop_detection`);
      setDetectionStatus("stopped");
      toast.success("Detection stopped successfully");
    } catch (error) {
      console.error("Error stopping detection:", error);
      toast.error(`Error stopping detection: ${error.response?.data?.message || error.message}`);
    }
  };

  if (userStatus === "loading") {
    return <div>Loading...</div>;
  }

  if (userStatus === "error") {
    return <div>Error loading user data</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Meta title="Parking" />
      <ToastContainer />
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Manage License Plates</h2>
        <div className="flex mb-4">
          <input
            type="text"
            placeholder="Enter license plate"
            value={newPlate}
            onChange={(e) => setNewPlate(e.target.value)}
            className="flex-grow mr-2 px-3 py-2 border rounded-md"
          />
          <button 
            onClick={() => handleAddPlate(newPlate)}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
          >
            Add Plate
          </button>
        </div>
        <ul className="space-y-2">
          {licensePlates.map((plate) => (
            <li key={plate} className="flex items-center justify-between bg-gray-100 p-3 rounded-md">
              <span>{plate}</span>
              <div>
                <button 
                  onClick={() => handleRemovePlate(plate)}
                  className="text-red-500 mr-2 hover:text-red-600 transition-colors"
                >
                  Remove
                </button>
                <button 
                  onClick={() => handleActivatePlate(plate)}
                  className="text-green-500 hover:text-green-600 transition-colors"
                >
                  Activate
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Parking Status</h2>
        {activePlate ? (
          <div className={`p-4 rounded-md ${parkingStatus === 'active' ? 'bg-green-100' : 'bg-yellow-100'}`}>
            <p className="mb-2">
              Current active plate: <strong>{activePlate}</strong>
            </p>
            <p className="mb-2">
              Status: <strong>{parkingStatus === 'active' ? 'Active' : 'Inactive'}</strong>
            </p>
            {parkingStatus === 'active' && remainingTime && (
              <p className="mb-2">
                Remaining time: <strong>{remainingTime}</strong>
              </p>
            )}
            <button
              onClick={() => handleActivatePlate(null)}
              className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
            >
              Deactivate Parking
            </button>
            <button
              onClick={getParkingStatus}
              className="bg-blue-500 text-white px-4 py-2 ml-2 rounded-md hover:bg-blue-600 transition-colors"
            >
              Refresh Status
            </button>
          </div>
        ) : (
          <div className="flex items-center">
            <select
              value={selectedPlate}
              onChange={(e) => setSelectedPlate(e.target.value)}
              className="flex-grow mr-2 px-3 py-2 border rounded-md"
            >
              <option value="">Select a license plate</option>
              {licensePlates.map((plate) => (
                <option key={plate} value={plate}>
                  {plate}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={parkingDuration}
              onChange={(e) => setParkingDuration(e.target.value)}
              className="mr-2 px-3 py-2 border rounded-md"
              placeholder="Duration (minutes)"
            />
            <button
              onClick={activateParking}
              disabled={!selectedPlate}
              className={`px-4 py-2 rounded-md transition-colors ${
                selectedPlate
                  ? "bg-green-500 text-white hover:bg-green-600"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              Activate Parking
            </button>
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Stream Detection</h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={detectionStatus === "running" ? stopDetection : startDetection}
            className={`px-4 py-2 rounded-md transition-colors ${
              detectionStatus === "running"
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-green-500 text-white hover:bg-green-600"
            }`}
          >
            {detectionStatus === "running" ? "Stop Detection" : "Start Detection"}
          </button>
          <div className={`flex items-center ${
            detectionStatus === "running" ? 'text-green-500' : 
            detectionStatus === "starting" ? 'text-yellow-500' : 'text-red-500'
          }`}>
            <div className={`w-3 h-3 rounded-full mr-2 ${
              detectionStatus === "running" ? 'bg-green-500' : 
              detectionStatus === "starting" ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>
            <span className="font-semibold">
              {detectionStatus === "running" ? "Detection is running" : 
               detectionStatus === "starting" ? "Detection is starting" : "Detection is stopped"}
            </span>
          </div>
        </div>
      </div>

      <Detections />
    </div>
  );
}

export default ParkingPage;