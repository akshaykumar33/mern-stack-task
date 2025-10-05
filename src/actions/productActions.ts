//@ts-nocheck
"use server";

import { sql } from "kysely";
import { DEFAULT_PAGE_SIZE } from "../../constant";
import { db } from "../../db";
import { InsertProducts, UpdateProducts } from "@/types";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/utils/authOptions";
import { cache } from "react";


export async function getProducts(
  pageNo: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE,
  filters = {}
) {
  try {
    let baseQuery = db.selectFrom("products").selectAll("products");

    // Brand filter: properly group OR conditions with parentheses
    if (filters.brandIds && filters.brandIds.length > 0) {
      const brandConditions = filters.brandIds.map(brandId =>
        sql`JSON_CONTAINS(products.brands, ${String(brandId)}, '$')`
      );
      // Wrap brandConditions in parentheses to avoid precedence issues
      baseQuery = baseQuery.where(sql`(${sql.join(brandConditions, sql` OR `)})`);
    }

    // Category filter with inner join and IN clause
    if (filters.categoryIds && filters.categoryIds.length > 0) {
      baseQuery = baseQuery
        .innerJoin(
          "product_categories",
          "products.id",
          "product_categories.product_id"
        )
        .where("product_categories.category_id", "in", filters.categoryIds);
    }

    // Gender filter
    if (filters.gender) {
      baseQuery = baseQuery.where("products.gender", "=", filters.gender);
    }

    // Price upper limit filter
    if (filters.priceRangeTo) {
      baseQuery = baseQuery.where("products.price", "<=", filters.priceRangeTo);
    }

    // Discount range filter, discount string like "6-10"
    if (filters.discount) {
      const [minDiscountStr, maxDiscountStr] = filters.discount.split("-");
      const minDiscount = Number(minDiscountStr);
      const maxDiscount = Number(maxDiscountStr);
      if (!isNaN(minDiscount) && !isNaN(maxDiscount)) {
        baseQuery = baseQuery
          .where("products.discount", ">=", minDiscount)
          .where("products.discount", "<=", maxDiscount);
      }
    }

    // Occasions filter: comma separated in products.occasion string
    if (filters.occasions && filters.occasions.length > 0) {
      const occasionConditions = filters.occasions.map(occasion =>
        sql`FIND_IN_SET(${occasion}, products.occasion) > 0`
      );
      baseQuery = baseQuery.where(sql`${sql.join(occasionConditions, sql` OR `)}`);
    }

    // Sorting
    if (filters.sortBy) {
      const [column, order] = filters.sortBy.split("-");
      const validColumns = ["price", "created_at", "rating"];
      const validOrders = ["asc", "desc"];
      if (validColumns.includes(column) && validOrders.includes(order)) {
        baseQuery = baseQuery.orderBy(`products.${column}`, order as "asc" | "desc");
      }
    }

    // Get total count for pagination (clone main query, remove limit/offset)
    const countResult = await db
      .selectFrom(baseQuery.as("filtered"))
      .select(sql`COUNT(DISTINCT filtered.id)`.as("count"))
      .executeTakeFirst();

    const totalCount = Number(countResult?.count ?? 0);
    const lastPage = Math.ceil(totalCount / pageSize);

    // Query paginated products with distinct to avoid duplicates due to join
    const products = await baseQuery
      .distinct()
      .offset((pageNo - 1) * pageSize)
      .limit(pageSize)
      .execute();

    // console.log("filters", filters);
    // console.log(baseQuery.compile().sql);

    const numOfResultsOnCurPage = products.length;

    return { products, count: totalCount, lastPage, numOfResultsOnCurPage };
  } catch (error) {
    throw error;
  }
}


export const getProduct = cache(async function getProduct(productId: number) {
  // console.log("run");
  try {
    const product = await db
      .selectFrom("products")
      .selectAll()
      .where("id", "=", productId)
      .execute();

    return product;
  } catch (error) {
    return { error: "Could not find the product" };
  }
});

async function enableForeignKeyChecks() {
  await sql`SET foreign_key_checks = 1`.execute(db);
}

async function disableForeignKeyChecks() {
  await sql`SET foreign_key_checks = 0`.execute(db);
}

export async function deleteProduct(productId: number) {
  try {
    await disableForeignKeyChecks();
    await db
      .deleteFrom("product_categories")
      .where("product_categories.product_id", "=", productId)
      .execute();
    await db
      .deleteFrom("reviews")
      .where("reviews.product_id", "=", productId)
      .execute();

    await db
      .deleteFrom("comments")
      .where("comments.product_id", "=", productId)
      .execute();

    await db.deleteFrom("products").where("id", "=", productId).execute();

    await enableForeignKeyChecks();
    revalidatePath("/products");
    return { message: "success" };
  } catch (error) {
    return { error: "Something went wrong, Cannot delete the product" };
  }
}

export async function MapBrandIdsToName(brandsId) {
  const brandsMap = new Map();
  try {
    for (let i = 0; i < brandsId.length; i++) {
      const brandId = brandsId.at(i);
      const brand = await db
        .selectFrom("brands")
        .select("name")
        .where("id", "=", +brandId)
        .executeTakeFirst();
      brandsMap.set(brandId, brand?.name);
    }
    return brandsMap;
  } catch (error) {
    throw error;
  }
}

export async function getAllProductCategories(products: any) {
  try {
    const productsId = products.map((product) => product.id);
    const categoriesMap = new Map();

    for (let i = 0; i < productsId.length; i++) {
      const productId = productsId.at(i);
      const categories = await db
        .selectFrom("product_categories")
        .innerJoin(
          "categories",
          "categories.id",
          "product_categories.category_id"
        )
        .select("categories.name")
        .where("product_categories.product_id", "=", productId)
        .execute();
      categoriesMap.set(productId, categories);
    }
    return categoriesMap;
  } catch (error) {
    throw error;
  }
}

export async function getProductCategories(productId: number) {
  try {
    const categories = await db
      .selectFrom("product_categories")
      .innerJoin(
        "categories",
        "categories.id",
        "product_categories.category_id"
      )
      .select(["categories.id", "categories.name"])
      .where("product_categories.product_id", "=", productId)
      .execute();

    return categories;
  } catch (error) {
    throw error;
  }
}

export async function editProduct(productId: number, value: any) {
  try {
    const updateData: any = {};

    if (value.name) updateData.name = value.name;
    if (value.description) updateData.description = value.description;
    if (value.brands && Array.isArray(value.brands)) {
      updateData.brands = JSON.stringify(value.brands.map((brand) => brand.value));
    }
    if (value.colors) updateData.colors = value.colors;
    if (value.occasion && Array.isArray(value.occasion)) {
      updateData.occasion = value.occasion.map((ocassion) => ocassion.value).join(",");
    }
    if (value.gender) updateData.gender = value.gender;

    updateData.discount = Number(value.discount.toString());
    updateData.old_price = Number(value.old_price.toString());
    updateData.price = Number(value.old_price.toString());
    updateData.rating = Number(value.rating.toString());

    if (value.image_url) updateData.image_url = value.image_url;

    //  console.log("updateData", updateData);

    await db
      .updateTable("products")
      .set(updateData)
      .where("products.id", "=", productId)
      .execute();


    // Now handle categories
    if (value.categories && Array.isArray(value.categories)) {
      const categoryIdsArr = value.categories.map((category) => category.value)

      // delete existing
      await db
        .deleteFrom("product_categories")
        .where("product_id", "=", productId)
        .execute();

      // insert new
      const inserts = categoryIdsArr.map((categoryId) => ({
        product_id: productId,
        category_id: categoryId,
      }));

      if (inserts.length > 0) {
        await db.insertInto("product_categories").values(inserts).execute();
      }
      // console.log("value.categories",value.categories)
    }

    revalidatePath("/products");

    return { message: "success" };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function addProduct(value: any) {
  try {
    const insertData: any = {};
    // console.log("value--> addProduct before",value);
    if (value.name) insertData.name = value.name;
    if (value.description) insertData.description = value.description;
    if (value.brands && Array.isArray(value.brands)) {
      insertData.brands = JSON.stringify(value.brands.map((brand) => brand.value));
    }
    if (value.colors) insertData.colors = value.colors;
    if (value.occasion && Array.isArray(value.occasion)) {
      insertData.occasion = value.occasion.map((ocassion) => ocassion.value).join(",");
    }
    if (value.gender) insertData.gender = value.gender;

    insertData.discount = Number(value.discount.toString())
    insertData.old_price = Number(value.old_price.toString());
    insertData.price = Number(value.old_price.toString());
    insertData.rating = Number(value.rating.toString());

    if (value.image_url) insertData.image_url = value.image_url;

    // console.log("insertData",insertData)
    // Insert into products table and get inserted product id
    const insertResult = await db
      .insertInto("products")
      .values(insertData)
      .execute();

    // console.log("insertResult",insertResult)
    const productId = insertResult[0]?.insertId;
    if (!productId) {
      throw new Error("Failed to insert product");
    }
    // console.log("value.categories", value.categories)
    // Insert category mappings if categories provided
    if (value.categories && Array.isArray(value.categories)) {
      const categoryIdsArr = value.categories.map((category) => category.value);

      const inserts = categoryIdsArr.map((categoryId) => ({
        product_id: productId,
        category_id: categoryId,
      }));

      if (inserts.length > 0) {
        await db.insertInto("product_categories").values(inserts).execute();
      }
    }

    revalidatePath("/products");

    return { message: "success" };
  } catch (err: any) {
    return { error: err.message };
  }
}

