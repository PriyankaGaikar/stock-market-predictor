import { Route, Routes } from "react-router-dom";
import { Info } from "lucide-react";
import Layout from "./components/Layout";
import About from "./pages/About";
import ComingSoon from "./pages/ComingSoon";
import Evaluation from "./pages/Evaluation";
import Explorer from "./pages/Explorer";
import Home from "./pages/Home";
import Prediction from "./pages/Prediction";
import Technical from "./pages/Technical";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="explorer" element={<Explorer />} />
        <Route path="technical" element={<Technical />} />
        <Route path="prediction" element={<Prediction />} />
        <Route path="evaluation" element={<Evaluation />} />
        <Route path="about" element={<About />} />
        <Route
          path="*"
          element={<ComingSoon title="Page not found" icon={Info} description="That page does not exist." />}
        />
      </Route>
    </Routes>
  );
}