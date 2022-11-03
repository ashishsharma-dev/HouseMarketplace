import { useState, useEffect, useRef } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { doc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore";

import { db } from "../firebase.config";
import { useNavigate, useParams } from "react-router-dom";
import Spinner from "../Components/Spinner";
import { toast } from "react-toastify";
import { v4 as uuidv4 } from "uuid";
import { async } from "@firebase/util";

const EditListing = () => {
  const [geolocationEnabled, setGeolocationEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [listing, setListing] = useState(null);
  const [formData, setFormData] = useState({
    type: "rent",
    name: "",
    bedrooms: 1,
    bathrooms: 1,
    parking: false,
    furnished: false,
    address: "",
    offer: false,
    regularPrice: 0,
    discountedPrice: 0,
    images: {},
    latitude: 0,
    longitude: 0,
  });

  const {
    type,
    name,
    bedrooms,
    bathrooms,
    parking,
    furnished,
    address,
    offer,
    regularPrice,
    discountedPrice,
    images,
    latitude,
    longitude,
  } = formData;

  const auth = getAuth();
  const navigate = useNavigate();
  const params = useParams();
  const isMounted = useRef(true);

  // redirect in case of unauthorize user
  useEffect(() => {
    if (listing && listing.userRef !== auth.currentUser.uid) {
      toast.error("You can not edit that listing");
      navigate("/");
    }
  });

  // fetch listing to edit
  useEffect(() => {
    setLoading(true);
    const fetchListing = async () => {
      const docRef = doc(db, "listings", params.listingId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setListing(docSnap.data());
        setFormData({ ...docSnap.data() });
        setLoading(false);
      } else {
        navigate("/");
        toast.error("Listing does not exists.");
      }
    };

    fetchListing();
  }, [params.listingId, navigate]);

  // Sets userRef to logged in user
  useEffect(() => {
    if (isMounted) {
      onAuthStateChanged(auth, (user) => {
        if (user) {
          setFormData({ ...formData, userRef: user.uid });
        } else {
          navigate("/sign-in");
        }
      });
    }
    return () => {
      isMounted.current = false;
    };
  }, [isMounted]);

  const onSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    if (discountedPrice >= regularPrice) {
      setLoading(false);
      toast.error("Both can not be same");
      return;
    }

    if (images.length > 6) {
      setLoading(false);
      toast.error("Max 6 Image Limit");
      return;
    }

    // let geoLocation = {};
    // let location;

    // if (geolocationEnabled) {
    //   geoLocation.lat = latitude;
    // const response = await fetch(
    //   `https://api.geoapify.com/v1/geocode/search?text=${address}&apiKey=041c396deab24b879857f402cc182740`
    // );

    // const response = await fetch(
    //   `http://api.positionstack.com/v1/forward?access_key=59b22d9ce24f848902618ff10e95db40&query=${address}`
    // );

    // const response = await fetch(``)
    // const data = await response.json();
    // geoLocation.lat = data.features[0].properties.lat ?? 0;
    // geoLocation.lon = data.features[0].properties.lon ?? 0;
    // console.log(geoLocation);
    // console.log(data);
    // console.log(data.features[0]);

    // location =
    //   data.features.length === 0
    //     ? undefined
    //     : data.features[0].properties.formatted;

    // if (location === undefined || location.includes("undefined")) {
    //   setLoading(false);
    //   toast.error("Please enter a correct address");
    //   return;
    // }
    // } else {
    //   geoLocation.lat = latitude;
    //   geoLocation.lng = longitude;
    //   location = address;
    // }

    // Store images to firebase
    const storeImage = async (image) => {
      return new Promise((res, rej) => {
        const storage = getStorage();
        const fileName = `${auth.currentUser.uid}-${image.name}-${uuidv4()}`;
        console.log(fileName);

        const storageRef = ref(storage, "images/" + fileName);
        const uploadTask = uploadBytesResumable(storageRef, image);

        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress =
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100;

            console.log("Upload is " + progress + "% done");

            switch (snapshot.state) {
              case "paused":
                console.log("Upload is paused");
                break;
              case "running":
                console.log("Upload is running");
                break;
            }
          },
          (error) => {
            rej(error);
          },
          () => {
            getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
              res(downloadURL);
            });
          }
        );
      });
    };

    const imgUrls = await Promise.all(
      [...images].map((image) => storeImage(image))
    ).catch(() => {
      setLoading(false);
      toast.error("Images not uploaded");
      return;
    });

    const formDataCopy = {
      ...formData,
      imgUrls,
      timestamp: serverTimestamp(),
    };

    delete formDataCopy.images;
    // delete formDataCopy.address;
    !formDataCopy.offer && delete formDataCopy.discountedPrice;

    // Update Listing here
    const docRef = doc(db, "listings", params.listingId);
    await updateDoc(docRef, formDataCopy);

    setLoading(false);
    toast.success("Listing saved");
    navigate(`/category/${formDataCopy.type}/${docRef.id}`);
  };

  const onMutate = (e) => {
    let boolean = null;
    if (e.target.value === "true") {
      boolean = true;
    }
    if (e.target.value === "false") {
      boolean = false;
    }

    // Files

    if (e.target.files) {
      setFormData((prevState) => ({
        ...prevState,
        images: e.target.files,
      }));
    }

    // Text/Booleans/Numbers
    if (!e.target.files) {
      setFormData((prevState) => ({
        ...prevState,
        [e.target.id]: boolean ?? e.target.value,
      }));
    }
  };

  if (loading) {
    return <Spinner />;
  }
  return (
    <div className="profile">
      <header>
        <p className="pageHeader">Edit Listing</p>
      </header>

      <main>
        <form onSubmit={onSubmit}>
          <label htmlFor="" className="formLabel">
            Sell / Rent
          </label>
          <div className="formButtons">
            <button
              type="button"
              className={type === "sale" ? "formButtonActive" : "formButton"}
              id="type"
              value="sale"
              onClick={onMutate}
            >
              Sell
            </button>

            <button
              type="button"
              className={type === "rent" ? "formButtonActive" : "formButton"}
              id="type"
              value="rent"
              onClick={onMutate}
            >
              Rent
            </button>
          </div>
          <label htmlFor="" className="formLabel">
            Name
          </label>
          <input
            type="text"
            className="formInputName"
            id="name"
            value={name}
            onChange={onMutate}
            maxLength="32"
            minLength="10"
            required
          />

          <div className="formRooms flex">
            <div>
              <label htmlFor="" className="formLabel">
                Bedrooms
              </label>
              <input
                type="number"
                className="formInputSmall"
                id="bedrooms"
                value={bedrooms}
                onChange={onMutate}
                max="50"
                min="1"
                required
              />
            </div>
            <div>
              <label htmlFor="" className="formLabel">
                Bathrooms
              </label>
              <input
                type="number"
                className="formInputSmall"
                id="bathrooms"
                value={bathrooms}
                onChange={onMutate}
                max="50"
                min="1"
                required
              />
            </div>
          </div>
          <label htmlFor="" className="formLabel">
            Parking Spot
          </label>
          <div className="formButtons">
            <button
              className={parking ? "formButtonActive" : "formButton"}
              type="button"
              id="parking"
              value={true}
              onClick={onMutate}
              min="1"
              max="50"
            >
              Yes
            </button>
            <button
              className={
                !parking && parking !== null ? "formButtonActive" : "formButton"
              }
              type="button"
              id="parking"
              value={false}
              onClick={onMutate}
            >
              No
            </button>
          </div>

          <label htmlFor="" className="formLabel">
            Furnished
          </label>
          <div className="formButtons">
            <button
              className={furnished ? "formButtonActive" : "formButton"}
              type="button"
              id="furnished"
              value={true}
              onClick={onMutate}
            >
              Yes
            </button>
            <button
              className={
                !furnished && furnished !== null
                  ? "formButtonActive"
                  : "formButton"
              }
              type="button"
              id="furnished"
              value={false}
              onClick={onMutate}
            >
              No
            </button>
          </div>

          <label htmlFor="" className="formLabel">
            <textarea
              id="address"
              type="text"
              value={address}
              onChange={onMutate}
              className="formInputAddress"
              required
            />
          </label>
          {!geolocationEnabled && (
            <div className="formLatLng flex">
              <div>
                <label htmlFor="" className="formLabel">
                  Latitude
                </label>
                <input
                  type="number"
                  className="formInputSmall"
                  id="latitude"
                  value={latitude}
                  onChange={onMutate}
                  required
                />
              </div>

              <div>
                <label htmlFor="" className="formLabel">
                  Longitude
                </label>
                <input
                  type="number"
                  className="formInputSmall"
                  id="longitude"
                  value={longitude}
                  onChange={onMutate}
                  required
                />
              </div>
            </div>
          )}

          <label htmlFor="" className="formLabel">
            Offer
          </label>
          <div className="formButtons">
            <button
              className={offer ? "formButtonActive" : "formButton"}
              type="button"
              id="offer"
              value={true}
              onClick={onMutate}
            >
              Yes
            </button>

            <button
              className={
                !offer && offer !== null ? "formButtonActive" : "formButton"
              }
              type="button"
              id="offer"
              value={false}
              onClick={onMutate}
            >
              No
            </button>
          </div>

          <label htmlFor="" className="formLabel">
            Regular Price
          </label>
          <div className="formPriceDiv">
            <input
              className="formInputSmall"
              type="number"
              id="regularPrice"
              value={regularPrice}
              onChange={onMutate}
              min="50"
              max="750000000"
            />
            {type === "rent" && <p className="formPriceText">₹ / Month</p>}
          </div>

          {offer && (
            <>
              <label htmlFor="" className="formLabel">
                Discounted Price
              </label>
              <input
                type="number"
                className="formInputSmall"
                id="discountedPrice"
                value={discountedPrice}
                onChange={onMutate}
                min="50"
                max="750000000"
                required={offer}
              />
            </>
          )}

          <label htmlFor="" className="formLabel">
            Images
          </label>
          <p className="imagesInfo">
            The first image will be the cover (max limit: 6)
          </p>
          <input
            type="file"
            className="formInputFile"
            id="images"
            onChange={onMutate}
            max="6"
            accept=".jpg,.png,.jpeg"
            multiple
            required
          />
          <button className="primaryButton createListingButton" type="submit">
            Edit Listing
          </button>
        </form>
      </main>
    </div>
  );
};

export default EditListing;
