//@ts-nocheck

"use client";

import { basicSchema } from "@/schemas/product";
import { getCategories } from "@/actions/categoryActions";
import { getBrands } from "@/actions/brandActions";
import {
  MapBrandIdsToName,
  getProduct,
  getProductCategories,
  updateProduct,
  updateProductCategories,
} from "@/actions/productActions";
import { useFormik } from "formik";
import { useEffect, useState } from "react";
import Select from "react-select";
import { occasionOptions } from "../../../../../constant";
import { notFound, useRouter } from "next/navigation";
import { UpdateProducts } from "@/types";
import { toast } from "react-toastify";
import { editProduct } from "@/actions/productActions";

function EditProduct({ params }: { params: { id: string } }) {
  const { id } = params;

  if (!Number(id)) {
    notFound();
  }

  const [loading, setLoading] = useState(true);
  const [brandsOption, setBrandsOption] = useState([]);
  const [occasionOption, setOccasionOption] = useState([]);
  const [categoriesOption, setCategoriesOption] = useState([]);
  const [initialValues, setInitialValues] = useState({});
  const [error, setError] = useState(false);

  const router = useRouter();
  const {
    values: product,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setValues,
  } = useFormik({
    initialValues: {
      name: "",
      description: "",
      old_price: "",
      discount: "",
      rating: 0,
      colors: "",
      brands: null,
      categories: null,
      gender: "",
      occasion: null,
      image_url: "",
    },
    validationSchema: basicSchema,

    onSubmit: async (values, actions) => {
      // console.log(id,values)
      const msg = await editProduct(id,values)
      // console.log(msg)
      if(msg.message == 'success')
        router.push('/products')
    },
  });

  // throw new Error("Function not implemented.");

  useEffect(() => {
    setLoading(true);
    (async function () {
      const productDetails: any = await getProduct(+id);

      if (error || productDetails.length === 0) {
        setError(true);
        return;
      }

      const [productArr] = productDetails;
      const brands = await getBrands();
      const brandsOption = brands.map((brand) => ({
        value: brand.id,
        label: brand.name,
      }));
      setBrandsOption(brandsOption as any);
      const selectedBrands = await MapBrandIdsToName(
        JSON.parse(productArr.brands)
      );
      const defaultBrandsOption = JSON.parse(productArr.brands).map((item) => ({
        value: item,
        label: selectedBrands.get(item),
      }));

      const categories = await getCategories();
      const categoriesOption = categories.map((category) => ({
        value: category.id,
        label: category.name,
      }));
      const initialCategories = await getProductCategories(+id);
      const defaultCategories = initialCategories.map((category) => ({
        value: category.id,
        label: category.name,
      }));

      setCategoriesOption(categoriesOption as any);

      const occasionOption = occasionOptions.map((item) => {
        return {
          value: item,
          label: item,
        };
      });
      const initialOccasion = productArr.occasion.split(",").map((item) => {
        return {
          value: item,
          label: item,
        };
      });
      setOccasionOption(occasionOption as any);
      const product = {
        name: productArr.name,
        description: productArr.description,
        old_price: productArr.old_price,
        discount: productArr.discount,
        colors: productArr.colors,
        brands: defaultBrandsOption,
        categories: defaultCategories,
        gender: productArr.gender,
        occasion: initialOccasion,
        rating: +productArr.rating,
        image_url: "",
      };
      setValues(product);
      setInitialValues(product);
      setLoading(false);
    })();
  }, [id, setValues]);

  if (error) {
    throw new Error("Product not found");
  }

  function handleChangeSelect(selectedOptions) {
    if (selectedOptions.length === 0) {
      setValues({
        ...product,
        brands: null,
      });
      return;
    }
    setValues({
      ...product,
      brands: selectedOptions,
    });
  }
  function handleOccasion(selectedOptions) {
    if (selectedOptions.length === 0) {
      setValues({
        ...product,
        occasion: null,
      });
      return;
    }
    setValues({
      ...product,
      occasion: selectedOptions,
    });
  }
  function handleCategories(selectedOptions) {
    if (selectedOptions.length === 0) {
      setValues({
        ...product,
        categories: null,
      });
      return;
    }
    setValues({
      ...product,
      categories: selectedOptions,
    });
  }

  function handleFileInput(e) {
    const file = e.target.files[0];
    setValues({
      ...product,
      image_url: `/images/${file.name}`,
    });
  }

  if (loading)
    return <h2 className="text-lg font-bold">Loading product details...</h2>;

  return (
    <div className="w-1/3 text-white">
      {isSubmitting && <p className="text-lg text-yellow-200">Submitting...</p>}
      <h1 className="mb-8 text-xl">Edit details of Product {id}</h1>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name">Product Name: </label>
          <input
            type="text"
            name="name"
            id="name"
            value={product.name}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Enter name"
          />
          {errors.name && touched.name && (
            <p className="error">{errors.name}</p>
          )}
        </div>
        <div>
          <label htmlFor="description">Product description: </label>
          <textarea
            className="text-black"
            id="description"
            name="description"
            value={product.description}
            onChange={handleChange}
            onBlur={handleBlur}
            rows={5}
            cols={30}
            placeholder="Enter description"
          />
          {errors.description && touched.description && (
            <p className="error">{errors.description}</p>
          )}
        </div>
        <div>
          <label htmlFor="description" id="price">
            Product old price:{" "}
          </label>
          <input
            type="number"
            name="old_price"
            placeholder="Enter old price"
            value={product.old_price}
            onChange={handleChange}
            onBlur={handleBlur}
            step={0.1}
          />
          {errors.old_price && touched.old_price && (
            <p className="error">{errors.old_price}</p>
          )}
        </div>
        <div>
          <label htmlFor="discount">Product Discount: </label>
          <input
            type="number"
            name="discount"
            id="discount"
            value={product.discount}
            onChange={handleChange}
            onBlur={handleBlur}
            step={0.1}
            placeholder="Enter product discount"
          />
          {errors.discount && touched.discount && (
            <p className="error">{errors.discount}</p>
          )}
        </div>
        <div>
          <label htmlFor="colors">Product colors: </label>
          <input
            type="text"
            name="colors"
            id="colors"
            placeholder="Enter product colors"
            onChange={handleChange}
            onBlur={handleBlur}
            value={product.colors}
          />
          {errors.colors && touched.colors && (
            <p className="error">{errors.colors}</p>
          )}
        </div>
        <div>
          <label htmlFor="rating">Product Rating: </label>
          <input
            type="number"
            className="text-black"
            name="rating"
            id="rating"
            min={0}
            max={5}
            value={product.rating}
            onBlur={handleBlur}
            onChange={handleChange}
          />
          {errors.rating && touched.rating && (
            <p className="error">{errors.rating}</p>
          )}
        </div>
        <div>
          <label htmlFor="gender">Product Gender: </label>
          <select
            className="text-black"
            name="gender"
            id="gender"
            value={product.gender}
            onChange={handleChange}
            onBlur={handleBlur}
          >
            {["men", "boy", "women", "girl"].map((gender, i) => {
              return (
                <option key={i} value={gender}>
                  {gender}
                </option>
              );
            })}
          </select>
          {errors.gender && touched.gender && (
            <p className="error">{errors.gender}</p>
          )}
        </div>

        <div>
          <label htmlFor="brands">Brands</label>
          <Select
            className="flex-1 text-black"
            options={brandsOption}
            isMulti
            name="brands"
            onChange={handleChangeSelect}
            onBlur={handleBlur}
            value={product.brands}
          />
          {errors.brands && touched.brands && (
            <p className="error">{errors.brands}</p>
          )}
        </div>

        <div className=" flex items-center gap-4 mb-4">
          <span>Choose Categories</span>
          <Select
            className="flex-1 text-black"
            options={categoriesOption}
            isMulti
            name="categories"
            onChange={handleCategories}
            onBlur={handleBlur}
            value={product.categories}
          />
          {errors.categories && touched.categories && (
            <p className="error">{errors.categories}</p>
          )}
        </div>

        <div className=" flex  items-center gap-4 mb-4">
          <span>Occasion</span>
          <Select
            className="flex-1 text-black"
            options={occasionOption}
            isMulti
            name="occasion"
            onChange={handleOccasion}
            onBlur={handleBlur}
            value={product.occasion}
          />
          {errors.occasion && touched.occasion && (
            <p className="error">{errors.occasion}</p>
          )}
        </div>

        <div className=" flex  items-center gap-4 mb-4">
          <label htmlFor="image_url">Upload an image</label>
          <input
            className="text-white"
            type="file"
            name="image_url"
            id="image_url"
            onChange={handleFileInput}
            accept="image/*"
          />
        </div>
        <button
          disabled={isSubmitting}
          type="submit"
          className="w-1/2 p-4 bg-white text-black"
        >
          Submit
        </button>
      </form>
    </div>
  );
}

export default EditProduct;
