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
  const [newPlate, setNewPlate] = useState("");
  const [selectedPlate, setSelectedPlate] = useState("");
  const [detectionStatus, setDetectionStatus] = useState({});
  const [parkingStatus, setParkingStatus] = useState(null);
  const [activeDetectionTasks, setActiveDetectionTasks] = useState([]);
  const [detectionState, setDetectionState] = useState("stopped");
  const [plateStatuses, setPlateStatuses] = useState({});

  useEffect(() => {
    if (userStatus === "success" && userData) {
      setLicensePlates(userData.licensePlates || []);
      setActivePlate(userData.activePlate || null);
    }
  }, [userData, userStatus]);

  useEffect(() => {
    const fetchPlateStatuses = async () => {
      const statuses = {};
      for (const plate of licensePlates) {
        try {
          const response = await axios.get(
            `${process.env.NEXT_PUBLIC_APP_SERVER}/check_task_status/${plate}`
          );
          const { status, task_id } = response.data;

          // Update the status based on the backend response
          if (status === 'active') {
            statuses[plate] = { status: 'active' };
          } else if (status === 'running') {
            statuses[plate] = { status: 'running', task_id };
          } else if (status === 'not found') {
            statuses[plate] = { status: 'inactive' };
          }
        } catch (error) {
          if (error.response && error.response.status === 404) {
            statuses[plate] = { status: 'inactive' };
          } else {
            console.error(`Error getting parking status for ${plate}:`, error);
          }
        }
      }
      setPlateStatuses(statuses);
    };

    fetchPlateStatuses();
    const intervalId = setInterval(fetchPlateStatuses, 60000); // Check every minute
    return () => clearInterval(intervalId);
  }, [licensePlates]);

  useEffect(() => {
    const checkDetectionStatus = async () => {
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_APP_SERVER}/detection_status`);
        const { status, task_id, state } = response.data;
        setDetectionStatus({ status, task_id, state });

        if (status === 'active') {
          setActiveDetectionTasks([task_id]);
          setDetectionState(state.toLowerCase());
        } else {
          setActiveDetectionTasks([]);
          setDetectionState('stopped');
        }

        console.log('Detection status:', response.data);
      } catch (error) {
        console.error('Error checking detection status:', error);
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

  const activateParking = async (plate) => {
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_APP_SERVER}/activate_parking`, {
        license_plate: plate,
      });
      handleActivatePlate(plate);
      console.log("Parking started");
      toast.success("Parking activated successfully");
      getParkingStatus();
    } catch (error) {
      console.error("Error activating parking:", error);
      toast.error(`Error activating parking: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleDeactivateParking = async () => {
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_APP_SERVER}/stop_parking/${activePlate}`);
      handleActivatePlate(null); // Deactivate the active plate
      setParkingStatus("inactive");
      console.log("Parking stopped");
      toast.success("Parking deactivated successfully");
    } catch (error) {
      console.error("Error deactivating parking:", error);
      toast.error(`Error deactivating parking: ${error.response?.data?.message || error.message}`);
    }
  };

  const getParkingStatus = async () => {
    if (!activePlate) return;

    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_APP_SERVER}/check_task_status/${activePlate}`
      );
      const { status, task_id } = response.data;
      setParkingStatus(status);
      if (status === "running") {
        console.log(`Parking active for ${activePlate}, task ID: ${task_id}`);
        // You might want to store the task_id for future reference
        // setTaskId(task_id);
      } else {
        console.log(`Parking inactive for ${activePlate}`);
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log(`No active parking task for ${activePlate}`);
        setParkingStatus("not running");
      } else {
        console.error("Error getting parking status:", error);
        toast.error(`Error getting parking status: ${error.response?.data?.message || error.message}`);
      }
    }
  };

  const startDetection = async () => {
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_APP_SERVER}/start_detection`);
      toast.success("Detection started successfully");
      setDetectionState("pending");
    } catch (error) {
      console.error("Error starting detection:", error);firebaseApp
      toast.error(`Error starting detection: ${error.response?.data?.message || error.message}`);
    }
  };

  const stopDetection = async () => {
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_APP_SERVER}/stop_detection`);
      toast.success("Detection stopped successfully");
      setDetectionState("stopped");
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
              <button 
                onClick={() => handleRemovePlate(plate)}
                className="text-red-500 mr-2 hover:text-red-600 transition-colors"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Parking Status</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {licensePlates.map((plate) => (
            <div
              key={plate}
              className={`p-4 rounded-md ${
                plateStatuses[plate]?.status === "running"
                  ? "bg-green-100"
                  : plateStatuses[plate]?.status === "inactive"
                  ? "bg-gray-100" // Change background to gray for inactive status
                  : "bg-green-200"
              }`}
            >
              <p className="mb-2">
                Plate: <strong>{plate}</strong>
              </p>
              <p className="mb-2">
                Status:{" "}
                <strong>
                  {plateStatuses[plate]?.status === "active"
                    ? "Active"
                    : plateStatuses[plate]?.status === "running"
                    ? "Running"
                    : plateStatuses[plate]?.status === "inactive"
                    ? "Inactive"
                    : "Loading..."}
                </strong>
              </p>
              {plateStatuses[plate]?.status === "inactive" && (
                <button
                  onClick={() => activateParking(plate)}
                  className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
                >
                  Activate
                </button>
              )}
              {plateStatuses[plate]?.status === "running" && (
                <button
                  onClick={() => handleDeactivateParking(plate)}
                  className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
                >
                  Deactivate
                </button>
              )}
              {plateStatuses[plate]?.status === "active" && (
                <button
                  onClick={() => handleDeactivateParking(plate)}
                  className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
                >
                  Deactivate
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Stream Detection</h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={detectionState === "stopped" ? startDetection : stopDetection}
            className={`px-4 py-2 rounded-md transition-colors ${
              detectionState === "stopped"
                ? "bg-green-500 text-white hover:bg-green-600"
                : "bg-red-500 text-white hover:bg-red-600"
            }`}
          >
            {detectionState === "stopped" ? "Start Detection" : "Stop Detection"}
          </button>
          <div
            className={`flex items-center px-4 py-2 rounded-md ${
              detectionState === "stopped"
                ? "bg-gray-200 text-gray-700"
                : "bg-green-200 text-green-700"
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full mr-2 ${
                detectionState === "stopped" ? "bg-gray-500" : "bg-green-500"
              }`}
            ></div>
            <span className="font-semibold capitalize">
              {detectionState === "stopped" ? "Stopped" : "Running"}
            </span>
          </div>
        </div>
      </div>

      <Detections />
    </div>
  );
}

export default ParkingPage;