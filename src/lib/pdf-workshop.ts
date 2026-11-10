export async function combineStudyDocuments(
  files: readonly File[],
  maxPages: number | null,
): Promise<Uint8Array> {
  if (!files.length) throw new Error("Choose at least one PDF or image.");
  const { PDFDocument } = await import("pdf-lib");
  const output = await PDFDocument.create();
  let pages = 0;
  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      const source = await PDFDocument.load(bytes);
      pages += source.getPageCount();
      if (maxPages !== null && pages > maxPages)
        throw Error(
          "Free accounts can export up to 15 pages per PDF. Remove pages or use SyllaPlus.",
        );
      for (const page of await output.copyPages(source, source.getPageIndices()))
        output.addPage(page);
    } else {
      pages++;
      if (maxPages !== null && pages > maxPages)
        throw Error("Free accounts can export up to 15 images or pages per PDF.");
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const context = canvas.getContext("2d");
      if (!context) throw Error("Your browser could not convert this image.");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (value) => (value ? resolve(value) : reject(Error("Image conversion failed."))),
          "image/jpeg",
          0.9,
        ),
      );
      const image = await output.embedJpg(await blob.arrayBuffer());
      const page = output.addPage([595.28, 841.89]);
      const fit = Math.min(555.28 / image.width, 801.89 / image.height);
      page.drawImage(image, {
        x: (595.28 - image.width * fit) / 2,
        y: (841.89 - image.height * fit) / 2,
        width: image.width * fit,
        height: image.height * fit,
      });
    }
  }

  return output.save();
}
