export async function zoomToGeometry(view, geometry) {
  await view.goTo({ target: geometry });
}
