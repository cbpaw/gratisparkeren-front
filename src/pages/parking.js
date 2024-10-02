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
import axios from "axios"; // Import axios

function ParkingPage() {
  const db = getFirestore(firebaseApp);
  const { user, updateProfile } = useAuth();
  const { data: userData, status: userStatus } = useUser(user?.uid);
  const [licensePlates, setLicensePlates] = useState([]);
  const [activePlate, setActivePlate] = useState(null);
  const { detections, detectionsStatus } = useScanautoDetections();
  const [newPlate, setNewPlate] = useState("");
  const [selectedPlate, setSelectedPlate] = useState("");
  const [parkingDuration, setParkingDuration] = useState(30); // Default parking duration in minutes
  const [isDetectionRunning, setIsDetectionRunning] = useState(false);

  useEffect(() => {
    if (userStatus === "success" && userData) {
      setLicensePlates(userData.licensePlates || []);
      setActivePlate(userData.activePlate || null);
    }
  }, [userData, userStatus]);

  const handleAddPlate = async (plate) => {
    if (!user) {
      console.error("User is not authenticated");
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
    }
  };

  const handleActivatePlate = async (plate) => {
    try {
      await setDoc(doc(db, "users", user.uid), { activePlate: plate }, { merge: true });
      setActivePlate(plate);
    } catch (error) {
      console.error("Error activating license plate:", error);
    }
  };

  const activateParking = async () => {
    try {
      await axios.post("http://localhost:5000/activate_parking", {
        license_plate: selectedPlate,
        duration_minutes: parkingDuration,
      });
      handleActivatePlate(selectedPlate);
      console.log("Parking started");
    } catch (error) {
      console.error("Error activating parking:", error);
    }
  };

  const getParkingStatus = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/parking_status?license_plate=${activePlate}`
      );
      const { status, remaining_time } = response.data;
      if (status === "active") {
        console.log(`Parking active for ${activePlate}, remaining time: ${remaining_time}`);
      } else {
        console.log(`Parking inactive for ${activePlate}`);
      }
    } catch (error) {
      console.error("Error getting parking status:", error);
    }
  };

  const startDetection = async () => {
    try {
      await axios.post("http://localhost:5000/start_detection");
      setIsDetectionRunning(true);
    } catch (error) {
      console.error("Error starting detection:", error);
    }
  };

  const stopDetection = async () => {
    try {
      await axios.post("http://localhost:5000/stop_detection");
      setIsDetectionRunning(false);
    } catch (error) {
      console.error("Error stopping detection:", error);
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
        <h2 className="text-2xl font-bold mb-4">Activate Parking</h2>
        {activePlate ? (
          <div className="bg-green-100 p-4 rounded-md">
            <p className="mb-2">
              Current active plate: <strong>{activePlate}</strong>
            </p>
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
              Get Parking Status
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
        <div className="flex items-center">
          <button
            onClick={isDetectionRunning ? stopDetection : startDetection}
            className={`px-4 py-2 rounded-md transition-colors ${
              isDetectionRunning
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-green-500 text-white hover:bg-green-600"
            }`}
          >
            {isDetectionRunning ? "Stop Detection" : "Start Detection"}
          </button>
          <span className="ml-4">
            {isDetectionRunning ? "Detection is running" : "Detection is stopped"}
          </span>
        </div>
      </div>

      <Detections />
    </div>
  );
}

export default ParkingPage;