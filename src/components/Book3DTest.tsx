import Book3DView from "./Book3DView";

export default function Book3DTest() {
  return (
    <div className="p-8">
      <h1 className="text-2xl mb-4">3D Book Test</h1>
      <Book3DView
        frontImage="/front.jpg"
        backImage="/backcover.jpg"
        binderImage="/binder.jpg"
        innerPages={[
          "/inner1.jpg",
          "/inner2.jpg",
        ]}
        dimensions={{ width: 30, height: 40, depth: 4 }}
      />
    </div>
  );
}
