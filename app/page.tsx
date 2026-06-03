"use client";

import { useEffect, useState } from "react";

type Set = {
  id: string;
  weight: number;
  reps: number;
};

type Workout = {
  id: string;
  exercise: string;
  sets: Set[];
  createdAt: string;
};

export default function Home() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [exercise, setExercise] = useState("");

  async function loadWorkouts() {
    const res = await fetch("/api/workouts");
    if (!res.ok) {
      console.error("API failed");
      return;
    }

    const data = await res.json();
    setWorkouts(data);
  }

  async function createWorkout() {
    if (!exercise.trim()) return;

    await fetch("/api/workouts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ exercise }),
    });

    setExercise("");
    loadWorkouts();
  }

  useEffect(() => {
    loadWorkouts();
  }, []);

  return (
    <main style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
      <h1>🏋️ Gym Tracker</h1>

      {/* CREATE WORKOUT */}
      <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
        <input
          value={exercise}
          onChange={(e) => setExercise(e.target.value)}
          placeholder="Exercise (e.g. Bench Press)"
        />

        <button onClick={createWorkout}>Create</button>
      </div>

      {/* WORKOUT LIST */}
      <div style={{ marginTop: 40 }}>
        {workouts.map((w) => (
          <WorkoutCard key={w.id} workout={w} setWorkouts={setWorkouts} />
        ))}
      </div>
    </main>
  );
}

/* -------------------- WORKOUT CARD -------------------- */

function WorkoutCard({
  workout,
  setWorkouts,
}: {
  workout: Workout;
  setWorkouts: React.Dispatch<React.SetStateAction<Workout[]>>;
}) {
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");

  async function addSet() {
    if (!weight || !reps) return;

    const res = await fetch("/api/sets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workoutId: workout.id,
        weight: Number(weight),
        reps: Number(reps),
        createdAt: new Date().toISOString(),
      }),
    });

    const newSet = await res.json();

    // 🔥 OPTIMISTIC UPDATE (ingen full reload)
    setWorkouts((prev) =>
      prev.map((w) =>
        w.id === workout.id ? { ...w, sets: [...w.sets, newSet] } : w,
      ),
    );

    setWeight("");
    setReps("");
  }

  return (
    <div style={{ border: "1px solid #ddd", marginTop: 20, padding: 12 }}>
      <h3>
        {workout.exercise} - {new Date(workout.createdAt).toLocaleDateString()}
      </h3>

      {/* SETS */}
      <div style={{ marginTop: 10 }}>
        {workout.sets?.map((s) => (
          <div key={s.id}>
            {s.weight} kg × {s.reps}
          </div>
        ))}
      </div>

      {/* ADD SET */}
      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
        <input
          placeholder="kg"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />

        <input
          placeholder="reps"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
        />

        <button onClick={addSet}>+ Set</button>
      </div>
    </div>
  );
}
