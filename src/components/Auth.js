import React, { useState } from "react";
import { auth, provider } from "../firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase"; // adjust path if needed

export default function Auth({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");

  const hydrateAndLogin = async (authUser) => {
    // Try get Firestore profile for this user
    const userRef = doc(db, "users", authUser.uid);
    let userProfile = {};
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      // If first login, create minimal profile
      await setDoc(userRef, {
        username: authUser.email,
        email: authUser.email,
        name: "",
        phone: "",
        address: ""
      });
      userProfile = { username: authUser.email, email: authUser.email, name: "", phone: "", address: "" };
    } else {
      userProfile = snap.data();
    }
    // Pass combined object to parent!
    onLogin({
      ...userProfile,
      uid: authUser.uid,
      email: authUser.email,
      username: authUser.email // for consistency
    });
  };

  const signInWithGoogle = async () => {
    try {
      const res = await signInWithPopup(auth, provider);
      await hydrateAndLogin(res.user);
    } catch (e) {
      setErr(e.message);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setErr("");
    try {
      let res;
      if (isRegister) {
        res = await createUserWithEmailAndPassword(auth, email, pw);
      } else {
        res = await signInWithEmailAndPassword(auth, email, pw);
      }
      await hydrateAndLogin(res.user);
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column",
      background: "#8cade1"
    }}>
      <div style={{
        background: "#fff", borderRadius: 12, padding: 32, boxShadow: "0 4px 24px #0002",
        minWidth: 320, display: "flex", flexDirection: "column", alignItems: "center"
      }}>
        <img src="/logo-placeholder.png" alt="Logo" style={{ width: 66, marginBottom: 18 }} />
        <h2 style={{ margin: 0, fontWeight: 600 }}>{isRegister ? "Register" : "Sign In"}</h2>
        <form onSubmit={handleSubmit} style={{ width: "100%", marginTop: 20 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{
              padding: "10px 14px", borderRadius: 5, border: "1px solid #ccc", width: "100%", marginBottom: 10
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            required
            style={{
              padding: "10px 14px", borderRadius: 5, border: "1px solid #ccc", width: "100%", marginBottom: 10
            }}
          />
          {err && <div style={{ color: "#980000", marginBottom: 10, fontSize: "0.95em" }}>{err}</div>}
          <button type="submit" style={{
            width: "100%", padding: "10px", borderRadius: 5, background: "#2a0516", color: "#fff",
            border: "none", fontWeight: 600, fontSize: "1em"
          }}>
            {isRegister ? "Register" : "Sign In"}
          </button>
        </form>
        <button onClick={signInWithGoogle} style={{
          marginTop: 18, width: "100%", padding: "10px", borderRadius: 5, border: "1px solid #8cade1", background: "#fff", color: "#2a0516",
          fontWeight: 600, fontSize: "1em", display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: 20, marginRight: 8 }} />
          Sign in with Google
        </button>
        <button onClick={() => setIsRegister(!isRegister)} style={{
          marginTop: 14, fontSize: "0.96em", background: "none", color: "#657899", border: "none", cursor: "pointer"
        }}>
          {isRegister ? "Already have an account? Sign In" : "Don't have an account? Register"}
        </button>
      </div>
    </div>
  );
}
